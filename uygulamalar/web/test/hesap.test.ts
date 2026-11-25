/**
 * Hesap işlemleri, şifre sıfırlama e-postası ve genel sıralama.
 */
process.env.MS_DB = 'bellek';
process.env.HAVUZ_YOLU = new URL('./ornek-havuz.json', import.meta.url).pathname;

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { veritabani, veritabaniSifirla } from '../sunucu/db.ts';
import type { Veritabani } from '../sunucu/db.ts';
import { kayitOl, buYil, girisYap, oturumAc, oturumBul, misafirOlustur, KimlikHatasi } from '../sunucu/kimlik.ts';
import type { Oyuncu, KayitGirdisi } from '../sunucu/kimlik.ts';
import { oyunVer, oyunBitir, cozumKaristir, OyunHatasi, bulmacaSiralamasi } from '../sunucu/oyun.ts';
import { profil, ayarGuncelle, sifreDegistir, hesapSil, verilerim, sifreSifirlamaIste, sifirlamaJetonuGecerli, sifreYenile } from '../sunucu/hesap.ts';
import { genelSiralama } from '../sunucu/siralama.ts';
import { gidenEpostalar } from '../sunucu/eposta.ts';
import { yorumEkle } from '../sunucu/yorum.ts';

let db: Veritabani;
const k = (rumuz: string, ek: Partial<KayitGirdisi> = {}): KayitGirdisi => ({
  eposta: `${rumuz}@ornek.com`, sifre: 'gizli-sifre-123', ad: 'Deniz', soyad: 'Ak', rumuz,
  dogumYili: buYil() - 30, gorunen: 'rumuz', yasGoster: false, kvkk: true, pazarlama: false, ...ek,
});
before(async () => { db = await veritabani(); });
after(async () => { await veritabaniSifirla(); });

const coz = async (o: Oyuncu, seviye: 'mini4' | 'kolay', sure: number) => {
  const v = await oyunVer(db, o, seviye);
  await db.sorgu(`UPDATE oyunlar SET baslangic = now() - interval '30 minutes' WHERE id = $1`, [v.oyunId]);
  return oyunBitir(db, o, v.oyunId, { cevap: cozumKaristir(v.cozumK, v.oyunId), sure, hata: 0, ipucu: 0 });
};
const kimlikHatasi = (alan: string) => (e: unknown) => e instanceof KimlikHatasi && e.alan === alan;

test('profil: istatistikler ve son oyunlar', async () => {
  const u = await kayitOl(db, k('profil_deniz'));
  await coz(u, 'mini4', 40);
  await coz(u, 'mini4', 20);
  await coz(u, 'kolay', 300);
  const p = await profil(db, u);
  assert.equal(p.rumuz, 'profil_deniz'); assert.equal(p.cozulen, 3); assert.equal(p.seri, 1);
  const mini = p.seviyeler.find((s) => s.seviye === 'mini4')!;
  assert.deepEqual([mini.cozulen, mini.enIyi, mini.ortalama], [2, 20, 30]);
  assert.equal(p.sonOyunlar.length, 3); assert.equal(p.sonOyunlar[0].seviye, 'kolay');
  assert.ok(p.toplamPuan > 0);
  assert.deepEqual(p.maclar, { kazanilan: 0, kaybedilen: 0 });
  await assert.rejects(profil(db, null), (e: unknown) => e instanceof OyunHatasi && e.durum === 401);
  const { oyuncu: misafir } = await misafirOlustur(db, '10.1.1.1');
  await assert.rejects(profil(db, misafir), (e: unknown) => e instanceof OyunHatasi && e.durum === 401);
});

test('ayarlar: görünüm, 18 yaş altı kısıtı, ad filtresi', async () => {
  const u = await kayitOl(db, k('ayar_yetiskin'));
  await ayarGuncelle(db, u, { ad: 'Elif', soyad: 'Su', gorunen: 'adsoyad', yasGoster: true, pazarlama: true });
  let p = await profil(db, u);
  assert.deepEqual([p.ad, p.soyad, p.gorunen, p.yasGoster, p.pazarlama], ['Elif', 'Su', 'adsoyad', true, true]);
  await coz(u, 'mini4', 30);
  const satir = (await genelSiralama(db, 'tum', u)).find((s) => s.benim)!;
  assert.equal(satir.ad, 'Elif Su'); assert.equal(satir.yas, 30);

  const genc = await kayitOl(db, k('ayar_genc', { dogumYili: buYil() - 15 }));
  await ayarGuncelle(db, genc, { ad: 'Can', soyad: 'Er', gorunen: 'adsoyad', yasGoster: true });
  p = await profil(db, genc);
  assert.deepEqual([p.gorunen, p.yasGoster, p.yetiskin], ['rumuz', false, false]);
  await assert.rejects(ayarGuncelle(db, u, { ad: '', soyad: 'Su' }), kimlikHatasi('ad'));
  await assert.rejects(ayarGuncelle(db, u, { ad: 'Orospu', soyad: 'Çocuğu' }), kimlikHatasi('ad'));
});

test('şifre değiştir: eski şifre gerekir, diğer oturumlar kapanır', async () => {
  const u = await kayitOl(db, k('sifre_deg'));
  const bu = await oturumAc(db, u.id as number), diger = await oturumAc(db, u.id as number);
  await assert.rejects(sifreDegistir(db, u, 'yanlis-sifre', 'yepyeni-sifre-1', bu), kimlikHatasi('eski'));
  await assert.rejects(sifreDegistir(db, u, 'gizli-sifre-123', 'kisa', bu), kimlikHatasi('yeni'));
  await sifreDegistir(db, u, 'gizli-sifre-123', 'yepyeni-sifre-1', bu);
  assert.ok(await oturumBul(db, bu)); assert.equal(await oturumBul(db, diger), null);
  assert.equal(await girisYap(db, 'sifre_deg', 'gizli-sifre-123'), null);
  assert.ok(await girisYap(db, 'sifre_deg', 'yepyeni-sifre-1'));
});

test('şifre sıfırlama: e-posta, tek kullanım, oturumlar kapanır, sınırlar', async () => {
  const u = await kayitOl(db, k('unutkan'));
  const oturum = await oturumAc(db, u.id as number);
  const once = gidenEpostalar().length;
  await sifreSifirlamaIste(db, 'yok@ornek.com', '10.2.2.2', 'https://mavisudoku.com');
  assert.equal(gidenEpostalar().length, once, 'olmayan hesaba e-posta gitmez (ama hata da verilmez)');
  await sifreSifirlamaIste(db, ' Unutkan@Ornek.com ', '10.2.2.2', 'https://mavisudoku.com');
  const e = gidenEpostalar().at(-1)!;
  assert.equal(e.kime, 'unutkan@ornek.com'); assert.match(e.konu, /şifreni yenile/);
  const jeton = /jeton=([\w-]+)/.exec(e.metin)![1];
  assert.ok(e.html.includes(jeton) && e.html.includes('Yeni şifre belirle'));
  assert.equal(await sifirlamaJetonuGecerli(db, jeton), true);
  assert.equal(await sifirlamaJetonuGecerli(db, 'x'.repeat(43)), false);
  await assert.rejects(sifreYenile(db, jeton, 'kisa'), kimlikHatasi('sifre'));
  assert.equal(await sifreYenile(db, jeton, 'cok-yeni-sifre-9'), u.id);
  assert.equal(await oturumBul(db, oturum), null);
  assert.ok(await girisYap(db, 'unutkan@ornek.com', 'cok-yeni-sifre-9'));
  await assert.rejects(sifreYenile(db, jeton, 'baska-sifre-77'), (x: unknown) => x instanceof OyunHatasi && x.durum === 400);
  // Süresi dolan jeton
  await sifreSifirlamaIste(db, 'unutkan@ornek.com', '10.2.2.3', 'https://mavisudoku.com');
  const j2 = /jeton=([\w-]+)/.exec(gidenEpostalar().at(-1)!.metin)![1];
  await db.sorgu(`UPDATE sifre_sifirlama SET bitis = now() - interval '1 minute'`);
  assert.equal(await sifirlamaJetonuGecerli(db, j2), false);
  // Aynı hesaba saatte en fazla 3 e-posta (sessizce), aynı IP'den saatte 10 istek
  const say = gidenEpostalar().length;
  for (let i = 0; i < 3; i++) await sifreSifirlamaIste(db, 'unutkan@ornek.com', `10.3.3.${i}`, 'https://x');
  assert.equal(gidenEpostalar().length, say + 1);
  for (let i = 0; i < 10; i++) await sifreSifirlamaIste(db, `kimse${i}@ornek.com`, '10.4.4.4', 'https://x').catch(() => {});
  await sifreSifirlamaIste(db, 'unutkan@ornek.com', '10.4.4.4', 'https://x'); // IP sınırı yalnızca kayıtlı denemeleri sayar
  await assert.rejects(sifreSifirlamaIste(db, 'gecersiz', '10.5.5.5', 'https://x'), kimlikHatasi('eposta'));
});

test('verilerim ve hesabı silme', async () => {
  const u = await kayitOl(db, k('silinecek'));
  const s = await coz(u, 'mini4', 25);
  await yorumEkle(db, u, s.bulmacaId, 'Güzel bir bulmacaydı, köşelerden başladım.');
  const v = await verilerim(db, u) as { hesap: { rumuz: string }; oyunlar: unknown[]; yorumlar: unknown[] };
  assert.equal(v.hesap.rumuz, 'silinecek'); assert.equal(v.oyunlar.length, 1); assert.equal(v.yorumlar.length, 1);
  await assert.rejects(hesapSil(db, u, 'gizli-sifre-123', 'evet'), kimlikHatasi('onay'));
  await assert.rejects(hesapSil(db, u, 'yanlis', 'SİL'), kimlikHatasi('sifre'));
  await hesapSil(db, u, 'gizli-sifre-123', 'sil');
  assert.equal(await girisYap(db, 'silinecek', 'gizli-sifre-123'), null);
  assert.ok(!(await bulmacaSiralamasi(db, s.bulmacaId, null)).some((x) => x.ad === 'silinecek'));
  const [{ n }] = await db.sorgu<{ n: number }>(`SELECT count(*)::int AS n FROM yorumlar WHERE metin LIKE 'Güzel bir bulmaca%'`);
  assert.equal(n, 0);
});

test('genel sıralama: dönemler, sıra, kendi satırın', async () => {
  const a = await kayitOl(db, k('genel_a')), b = await kayitOl(db, k('genel_b'));
  const { oyuncu: m } = await misafirOlustur(db, '10.6.6.6');
  await coz(a, 'kolay', 200); await coz(a, 'mini4', 20);
  await coz(b, 'mini4', 10);
  await coz(m, 'mini4', 15);
  // b'nin bir çözümünü geçen haftaya taşı: haftalıkta ve bugünde yok, tüm zamanlarda var
  const b2 = await coz(b, 'kolay', 250);
  await db.sorgu(`UPDATE oyunlar SET bitis = now() - interval '8 days' WHERE bulmaca_id = $1 AND kullanici_id = $2`, [b2.bulmacaId, b.id]);
  const bugun = await genelSiralama(db, 'gun', a);
  const ia = bugun.findIndex((s) => s.ad === 'genel_a'), ib = bugun.findIndex((s) => s.ad === 'genel_b');
  assert.ok(ia >= 0 && ib >= 0 && ia < ib, 'kolay çözen a, b\'nin önünde');
  assert.ok(bugun[ia].benim); assert.equal(bugun[ia].cozulen, 2);
  assert.ok(bugun.some((s) => s.misafir));
  assert.deepEqual(bugun.map((s) => s.sira), bugun.map((_, i) => i + 1));
  const tum = await genelSiralama(db, 'tum', null);
  assert.equal(tum.find((s) => s.ad === 'genel_b')!.cozulen, 2);
  assert.equal((await genelSiralama(db, 'hafta', null)).find((s) => s.ad === 'genel_b')!.cozulen, 1);
  // Listeye girmeyen oyuncunun kendi satırı sona eklenir
  const kisa = await genelSiralama(db, 'gun', m, 1);
  assert.equal(kisa.length, 2); assert.equal(kisa[1].benim, true); assert.ok(kisa[1].sira > 1);
});
