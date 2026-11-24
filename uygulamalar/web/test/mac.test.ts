/**
 * Arkadaşınla oyna: davet, kabul, aynı bulmaca, ilerleme, kazanan.
 */
process.env.MS_DB = 'bellek';
process.env.HAVUZ_YOLU = new URL('./ornek-havuz.json', import.meta.url).pathname;

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { veritabani, veritabaniSifirla } from '../sunucu/db.ts';
import type { Veritabani } from '../sunucu/db.ts';
import { kayitOl, buYil, misafirOlustur } from '../sunucu/kimlik.ts';
import type { Oyuncu, KayitGirdisi } from '../sunucu/kimlik.ts';
import { oyunVer, oyunBitir, cozumKaristir, OyunHatasi, oyuncuOzeti } from '../sunucu/oyun.ts';
import { davetGonder, davetYanitla, davetIptal, macDurumu, ilerlemeBildir, macListesi, bekleyenDavetSayisi } from '../sunucu/mac.ts';

let db: Veritabani;
let ali: Oyuncu, ayse: Oyuncu, can: Oyuncu;
const k = (rumuz: string): KayitGirdisi => ({
  eposta: `${rumuz}@ornek.com`, sifre: 'gizli-sifre-123', ad: rumuz.split('_')[0].replace(/^./, (c) => c.toUpperCase()), soyad: 'Deneme', rumuz,
  dogumYili: buYil() - 30, gorunen: 'rumuz', yasGoster: false, kvkk: true, pazarlama: false,
});
before(async () => {
  db = await veritabani();
  ali = await kayitOl(db, k('ali_mac'));
  ayse = await kayitOl(db, k('ayse_mac'));
  can = await kayitOl(db, k('can_mac'));
});
after(async () => { await veritabaniSifirla(); });

const hataBekle = async (p: Promise<unknown>, durum: number, desen?: RegExp) => {
  await assert.rejects(p, (e: unknown) => e instanceof OyunHatasi && e.durum === durum && (!desen || desen.test(e.message)));
};
const baslangiciGeriAl = (macId: number) => db.sorgu(
  `UPDATE oyunlar SET baslangic = baslangic - interval '2 minutes' WHERE bulmaca_id = (SELECT bulmaca_id FROM maclar WHERE id = $1);
   `.trim().replace(/;$/, ''), [macId]).then(() => db.sorgu(`UPDATE maclar SET baslangic = baslangic - interval '2 minutes' WHERE id = $1`, [macId]));

test('davet kuralları: üyelik, rumuz, kendini davet, tekrar davet', async () => {
  const { oyuncu: misafir } = await misafirOlustur(db, '10.9.9.9');
  await hataBekle(davetGonder(db, misafir, 'ayse_mac', 'mini4'), 401);
  await hataBekle(davetGonder(db, null, 'ayse_mac', 'mini4'), 401);
  await hataBekle(davetGonder(db, ali, 'yok_boyle', 'mini4'), 404);
  await hataBekle(davetGonder(db, ali, 'ali_mac', 'mini4'), 400, /Kendini/);
  await hataBekle(davetGonder(db, ali, 'ayse_mac', 'olmayan'), 400);
  const { macId } = await davetGonder(db, ali, '@Ayse_Mac', 'mini4');
  await hataBekle(davetGonder(db, ayse, 'ali_mac', 'kolay'), 409, /zaten/);
  assert.equal(await bekleyenDavetSayisi(db, ayse), 1);
  assert.equal(await bekleyenDavetSayisi(db, ali), 0);
  const l = await macListesi(db, ayse);
  assert.equal(l.gelen.length, 1); assert.equal(l.gelen[0].rumuz, 'ali_mac');
  assert.equal((await macListesi(db, ali)).giden.length, 1);
  // Yalnızca davet edilen kabul edebilir, yalnızca davet eden iptal edebilir
  await hataBekle(davetYanitla(db, ali, macId, true), 409);
  await hataBekle(davetYanitla(db, can, macId, true), 409);
  await hataBekle(davetIptal(db, ayse, macId), 409);
  await davetIptal(db, ali, macId);
  await hataBekle(davetYanitla(db, ayse, macId, true), 409);
});

test('reddetme ve süresi dolan davet', async () => {
  const a = await davetGonder(db, ali, 'can_mac', 'kolay');
  assert.deepEqual(await davetYanitla(db, can, a.macId, false), { macId: a.macId, basladi: false });
  assert.equal((await macDurumu(db, ali, a.macId)).durum, 'reddedildi');
  const b = await davetGonder(db, ali, 'can_mac', 'kolay');
  await db.sorgu(`UPDATE maclar SET olusturma = now() - interval '11 minutes' WHERE id = $1`, [b.macId]);
  await hataBekle(davetYanitla(db, can, b.macId, true), 409);
  assert.equal((await macDurumu(db, ali, b.macId)).durum, 'suresi-doldu');
  await hataBekle(macDurumu(db, ayse, b.macId), 404); // başkasının maçı görünmez
});

test('maç: aynı bulmaca, geri sayım, ilerleme, ilk bitiren kazanır', async () => {
  // Ali'nin daha önce açtığı bulmaca maçta gelmemeli
  const tekBasina = await oyunVer(db, ali, 'mini4');
  const { macId } = await davetGonder(db, ali, 'ayse_mac', 'mini4');
  assert.equal((await davetYanitla(db, ayse, macId, true)).basladi, true);
  let d = await macDurumu(db, ali, macId);
  assert.equal(d.durum, 'basladi');
  assert.ok(d.bulmacaId && d.bulmacaId !== tekBasina.bulmacaId);
  assert.ok(d.baslamayaKalanMs! > 3000 && d.baslamayaKalanMs! <= 5000, `geri sayım ${d.baslamayaKalanMs}`);
  assert.equal(d.ben.rumuz, 'ali_mac'); assert.equal(d.rakip.rumuz, 'ayse_mac');
  assert.equal(d.sonuc, null); assert.equal(d.bitti, false);
  // İki oyuncu da aynı bulmacayı alır; maç bulmacası tek başına oyunda "devam" olarak gelmez
  const oa = await oyunVer(db, ali, 'mini4', d.bulmacaId!);
  const oy = await oyunVer(db, ayse, 'mini4', d.bulmacaId!);
  assert.equal(oa.bulmaca, oy.bulmaca); assert.ok(oa.devam && oy.devam);
  assert.ok(oa.gecenSaniye <= 0);
  assert.equal((await oyunVer(db, ayse, 'mini4')).bulmacaId === d.bulmacaId, false);
  assert.equal((await oyuncuOzeti(db, ali)).yarim?.bulmacaId === d.bulmacaId, false);

  await baslangiciGeriAl(macId);
  await ilerlemeBildir(db, ayse, macId, 5, 1);
  await ilerlemeBildir(db, can, macId, 9, 0); // maçta olmayanın bildirimi yok sayılır
  d = await macDurumu(db, ali, macId);
  assert.equal(d.rakip.dogru, 5); assert.equal(d.rakip.hata, 1); assert.equal(d.ben.dogru, 0);

  await oyunBitir(db, ayse, oy.oyunId, { cevap: cozumKaristir(oy.cozumK, oy.oyunId), sure: 70, hata: 1, ipucu: 0 });
  d = await macDurumu(db, ali, macId);
  assert.equal(d.sonuc, 'kaybettin'); assert.equal(d.rakip.bitti, true); assert.equal(d.rakip.dogru, d.bosHucre); assert.equal(d.bitti, false);
  await oyunBitir(db, ali, oa.oyunId, { cevap: cozumKaristir(oa.cozumK, oa.oyunId), sure: 90, hata: 0, ipucu: 0 });
  d = await macDurumu(db, ali, macId);
  assert.equal(d.sonuc, 'kaybettin'); assert.equal(d.bitti, true);
  assert.equal((await macDurumu(db, ayse, macId)).sonuc, 'kazandin');
  const l = await macListesi(db, ayse);
  assert.equal(l.maclar[0].sonuc, 'kazandin'); assert.equal(l.maclar[0].rakip, 'ali_mac');
});

test('rövanşta yeni bulmaca gelir; kimse bitirmezse 60 dakikada zaman aşımı', async () => {
  const { macId } = await davetGonder(db, ayse, 'ali_mac', 'mini4');
  await davetYanitla(db, ali, macId, true);
  const d1 = await macDurumu(db, ali, macId);
  const [{ n }] = await db.sorgu<{ n: number }>(`SELECT count(*)::int AS n FROM oyunlar WHERE bulmaca_id = $1`, [d1.bulmacaId]);
  assert.equal(n, 2);
  await db.sorgu(`UPDATE maclar SET baslangic = now() - interval '61 minutes' WHERE id = $1`, [macId]);
  const d2 = await macDurumu(db, ali, macId);
  assert.equal(d2.sonuc, 'zaman-asimi'); assert.equal(d2.bitti, true);
});

test('havuz tükenince maç için yeni bulmaca üretilir', async () => {
  // Örnek havuzda mini6 için 2 bulmaca var; birkaç maç sonra üretim devreye girer
  for (let i = 0; i < 3; i++) {
    const { macId } = await davetGonder(db, can, 'ayse_mac', 'mini6');
    assert.equal((await davetYanitla(db, ayse, macId, true)).basladi, true);
  }
  const [{ n }] = await db.sorgu<{ n: number }>(`SELECT count(DISTINCT bulmaca_id)::int AS n FROM maclar WHERE seviye = 'mini6'`);
  assert.equal(n, 3);
});
