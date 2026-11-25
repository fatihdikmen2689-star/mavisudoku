/**
 * Sunucu servislerinin testleri: bellekteki PostgreSQL (PGlite) ile gerçek SQL çalıştırılır.
 */
process.env.MS_DB = 'bellek';
process.env.HAVUZ_YOLU = new URL('./ornek-havuz.json', import.meta.url).pathname;

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { veritabani, veritabaniSifirla } from '../sunucu/db.ts';
import type { Veritabani } from '../sunucu/db.ts';
import {
  misafirOlustur, misafirBul, kayitOl, girisYap, oturumAc, oturumBul, oturumKapat, misafirAktar, rumuzMusait, KimlikHatasi, buYil,
} from '../sunucu/kimlik.ts';
import type { Oyuncu, KayitGirdisi } from '../sunucu/kimlik.ts';
import { oyunVer, oyunBitir, bulmacaSiralamasi, cozumKaristir, gununBulmacasi, oyuncuOzeti, bulmacaBilgisi, OyunHatasi, seriHesapla } from '../sunucu/oyun.ts';
import { yorumEkle, yorumlar } from '../sunucu/yorum.ts';
import { filtrele } from '../sunucu/filtre.ts';

let db: Veritabani;
before(async () => { db = await veritabani(); });
after(async () => { await veritabaniSifirla(); });

const kayit = (ek: Partial<KayitGirdisi> = {}): KayitGirdisi => ({
  eposta: 'ece@ornek.com', sifre: 'gizli-sifre-123', ad: 'Ece', soyad: 'Kaya', rumuz: 'ece_kalfa',
  dogumYili: buYil() - 29, gorunen: 'rumuz', yasGoster: true, kvkk: true, pazarlama: false, ...ek,
});

/** Oyunu tarayıcıdaki gibi çözer: karıştırılmış çözümü geri açar */
const coz = (v: { oyunId: number; cozumK: string }) => cozumKaristir(v.cozumK, v.oyunId);

test('havuz yüklendi', async () => {
  const [{ n }] = await db.sorgu<{ n: number }>('SELECT count(*)::int AS n FROM bulmacalar');
  assert.ok(n >= 16, `bulmaca sayısı ${n}`);
});

test('misafir: oluşturma, bulma, IP sınırı', async () => {
  const { oyuncu, jeton } = await misafirOlustur(db, '10.0.0.1');
  assert.equal(oyuncu.tip, 'misafir');
  assert.match((oyuncu as { ad: string }).ad, /^misafir\d{4,6}$/);
  assert.deepEqual(await misafirBul(db, jeton), oyuncu);
  assert.equal(await misafirBul(db, 'yanlis'), null);
  for (let i = 0; i < 30; i++) await misafirOlustur(db, '10.0.0.2');
  await assert.rejects(misafirOlustur(db, '10.0.0.2'), KimlikHatasi);
});

test('kayıt: doğrulamalar ve 13 yaş sınırı', async () => {
  await assert.rejects(kayitOl(db, kayit({ eposta: 'bozuk' })), /e-posta/);
  await assert.rejects(kayitOl(db, kayit({ sifre: 'kisa' })), /8 karakter/);
  await assert.rejects(kayitOl(db, kayit({ rumuz: 'AB' })), /3–20/);
  await assert.rejects(kayitOl(db, kayit({ rumuz: 'misafir1234' })), /misafir/);
  await assert.rejects(kayitOl(db, kayit({ rumuz: 'orospu_x' })), /kullanılamaz/);
  await assert.rejects(kayitOl(db, kayit({ dogumYili: buYil() - 10 })), /13 yaşında/);
  await assert.rejects(kayitOl(db, kayit({ kvkk: false })), /KVKK/);
  const u = await kayitOl(db, kayit());
  assert.equal(u.tip, 'uye');
  await assert.rejects(kayitOl(db, kayit({ rumuz: 'baska' })), /e-posta ile zaten/);
  await assert.rejects(kayitOl(db, kayit({ eposta: 'baska@ornek.com' })), /alınmış/);
  assert.deepEqual(await rumuzMusait(db, 'ece_kalfa'), { musait: false, neden: 'Bu rumuz alınmış.' });
  assert.deepEqual(await rumuzMusait(db, 'yeni.oyuncu'), { musait: true });
});

test('giriş ve oturum', async () => {
  assert.equal(await girisYap(db, 'ece@ornek.com', 'yanlis-sifre'), null);
  const u = await girisYap(db, 'ECE_KALFA', 'gizli-sifre-123');
  assert.ok(u);
  const jeton = await oturumAc(db, u.id);
  assert.equal((await oturumBul(db, jeton))?.id, u.id);
  await oturumKapat(db, jeton);
  assert.equal(await oturumBul(db, jeton), null);
  const [{ sifre_ozet }] = await db.sorgu<{ sifre_ozet: string }>(`SELECT sifre_ozet FROM kullanicilar WHERE id = $1`, [u.id]);
  assert.ok(sifre_ozet.startsWith('scrypt$') && !sifre_ozet.includes('gizli'));
});

test('oyun: her bulmaca bir kez, yarım kalan geri gelir, yanlış çözüm reddedilir', async () => {
  const { oyuncu } = await misafirOlustur(db, '10.0.0.3');
  const a = await oyunVer(db, oyuncu, 'mini4');
  assert.equal(a.devam, false);
  assert.equal(a.bulmaca.length, 16);
  assert.ok(!('cozum' in a));
  const tekrar = await oyunVer(db, oyuncu, 'mini4');
  assert.equal(tekrar.oyunId, a.oyunId, 'yarım kalan oyun geri gelmeli');
  assert.equal(tekrar.devam, true);
  await assert.rejects(oyunBitir(db, oyuncu, a.oyunId, { cevap: a.bulmaca, sure: 60, hata: 0, ipucu: 0 }), /doğru değil/);
  const sonuc = await oyunBitir(db, oyuncu, a.oyunId, { cevap: coz(a), sure: 60, hata: 1, ipucu: 0 });
  assert.equal(sonuc.cozulenSeviyede, 1);
  assert.ok(sonuc.sure <= 5, 'tarayıcı süresi sunucu süresini aşamaz');
  assert.equal(sonuc.siralamada, false, 'sunucuya göre birkaç saniyede çözüldü: sıralamaya girmemeli');
  await assert.rejects(oyunBitir(db, oyuncu, a.oyunId, { cevap: coz(a), sure: 60, hata: 0, ipucu: 0 }), /zaten bitti/);
  const b = await oyunVer(db, oyuncu, 'mini4');
  assert.notEqual(b.bulmacaId, a.bulmacaId, 'aynı bulmaca ikinci kez verilmemeli');
  await assert.rejects(oyunVer(db, oyuncu, 'mini4', a.bulmacaId), (e: OyunHatasi) => e.durum === 409);
  const yeni = await oyunVer(db, oyuncu, 'mini4', undefined, true);
  assert.notEqual(yeni.bulmacaId, b.bulmacaId, '"sıradaki bulmaca" yeni bulmaca açar');
  const baskasi = await misafirOlustur(db, '10.0.0.4');
  await assert.rejects(oyunBitir(db, baskasi.oyuncu, b.oyunId, { cevap: coz(b), sure: 60, hata: 0, ipucu: 0 }), /bulunamadı/);
});

test('oyun: havuz bitince yeni bulmaca üretilir', async () => {
  const { oyuncu } = await misafirOlustur(db, '10.0.0.5');
  const gorulen = new Set<number>();
  for (let i = 0; i < 6; i++) {
    const v = await oyunVer(db, oyuncu, 'mini6', undefined, true);
    assert.ok(!gorulen.has(v.bulmacaId));
    gorulen.add(v.bulmacaId);
  }
});

async function suresiniGeriAl(oyunId: number, saniye: number) {
  await db.sorgu(`UPDATE oyunlar SET baslangic = now() - ($2 || ' seconds')::interval WHERE id = $1`, [oyunId, String(saniye)]);
}

test('sıralama: puana göre, misafir etiketli, 18 yaş altı korumalı, seri ve rekor', async () => {
  const yetiskin = await kayitOl(db, kayit({ eposta: 'ayse@ornek.com', rumuz: 'ayse_k', ad: 'Ayşe', soyad: 'Kaya', gorunen: 'adsoyad', yasGoster: true, dogumYili: buYil() - 41 }));
  const genc = await kayitOl(db, kayit({ eposta: 'genc@ornek.com', rumuz: 'genc_oyuncu', ad: 'Can', soyad: 'Demir', gorunen: 'adsoyad', yasGoster: true, dogumYili: buYil() - 15 }));
  const misafir = (await misafirOlustur(db, '10.0.0.6')).oyuncu;
  const kolay = await oyunVer(db, yetiskin, 'kolay');
  const bid = kolay.bulmacaId;
  const g = await oyunVer(db, genc, 'kolay', bid);
  const m = await oyunVer(db, misafir, 'kolay', bid);
  await suresiniGeriAl(kolay.oyunId, 400); await suresiniGeriAl(g.oyunId, 300); await suresiniGeriAl(m.oyunId, 500);
  const s1 = await oyunBitir(db, yetiskin, kolay.oyunId, { cevap: coz(kolay), sure: 380, hata: 0, ipucu: 0 });
  assert.equal(s1.sira, 1); assert.equal(s1.siralamada, true); assert.equal(s1.rekor, false); assert.equal(s1.seri, 1);
  const s2 = await oyunBitir(db, genc, g.oyunId, { cevap: coz(g), sure: 250, hata: 0, ipucu: 0 });
  assert.equal(s2.sira, 1, 'daha hızlı → birinci');
  const s3 = await oyunBitir(db, misafir, m.oyunId, { cevap: coz(m), sure: 480, hata: 3, ipucu: 1 });
  assert.equal(s3.sira, 3); assert.equal(s3.toplam, 3);
  const liste = await bulmacaSiralamasi(db, bid, yetiskin);
  assert.deepEqual(liste.map((x) => x.ad), ['genc_oyuncu', 'Ayşe Kaya', (misafir as { ad: string }).ad]);
  assert.equal(liste[0].yas, null, '18 yaş altının yaşı gösterilmez');
  assert.equal(liste[1].yas, 41);
  assert.equal(liste[1].benim, true);
  assert.equal(liste[2].misafir, true);
  // İkinci kolay bulmacada daha hızlı → rekor
  const k2 = await oyunVer(db, yetiskin, 'kolay', undefined, true);
  await suresiniGeriAl(k2.oyunId, 200);
  const s4 = await oyunBitir(db, yetiskin, k2.oyunId, { cevap: coz(k2), sure: 190, hata: 0, ipucu: 0 });
  assert.equal(s4.rekor, true); assert.equal(s4.oncekiEnIyi, 380);
  const oz = await oyuncuOzeti(db, yetiskin);
  assert.deepEqual(oz.seviyeler.kolay, { cozulen: 2, enIyi: 190 });
  const bilgi = await bulmacaBilgisi(db, bid);
  assert.equal(bilgi?.cozulme, 3); assert.equal(bilgi?.rekor, 250);
});

test('seri: üst üste günler sayılır, boşluk seriyi bozar', async () => {
  const u = await kayitOl(db, kayit({ eposta: 'seri@ornek.com', rumuz: 'seri_ustasi' }));
  const ekle = async (gunOnce: number) => {
    const v = await oyunVer(db, u, 'kolay', undefined, true);
    await db.sorgu(`UPDATE oyunlar SET bitis = now() - ($2 || ' days')::interval, sure = 300, puan = 100 WHERE id = $1`, [v.oyunId, String(gunOnce)]);
  };
  await ekle(1); await ekle(2); await ekle(3); await ekle(5);
  assert.equal(await seriHesapla(db, u), 3, 'dün, önceki gün ve ondan önceki gün');
  await ekle(0);
  assert.equal(await seriHesapla(db, u), 4);
});

test('misafir skorları üyeliğe aktarılır, çakışan bulmacada üyenin kaydı kalır', async () => {
  const { oyuncu: misafir } = await misafirOlustur(db, '10.0.0.7');
  const uye = await kayitOl(db, kayit({ eposta: 'aktar@ornek.com', rumuz: 'aktaran' }));
  const ortak = await oyunVer(db, uye, 'orta');
  await oyunVer(db, misafir, 'orta', ortak.bulmacaId);
  const sadeceMisafir = await oyunVer(db, misafir, 'zor');
  const aktarilan = await misafirAktar(db, misafir.id, uye.id);
  assert.equal(aktarilan, 1);
  const r = await db.sorgu<{ n: number }>(`SELECT count(*)::int AS n FROM oyunlar WHERE kullanici_id = $1`, [uye.id]);
  assert.equal(r[0].n, 2);
  assert.ok((await oyunVer(db, uye, 'zor')).bulmacaId === sadeceMisafir.bulmacaId, 'misafirin yarım oyunu üyeye geçti');
});

test('yorum: yalnızca bitiren üyeler, filtre, hız sınırı', async () => {
  const u = await kayitOl(db, kayit({ eposta: 'yorum@ornek.com', rumuz: 'yorumcu' }));
  const v = await oyunVer(db, u, 'zor');
  await assert.rejects(yorumEkle(db, null, v.bulmacaId, 'merhaba'), /üye/);
  await assert.rejects(yorumEkle(db, u, v.bulmacaId, 'Güzel bulmaca'), /bitirmelisin/);
  await suresiniGeriAl(v.oyunId, 600);
  await oyunBitir(db, u, v.oyunId, { cevap: coz(v), sure: 590, hata: 0, ipucu: 0 });
  assert.deepEqual(await yorumEkle(db, u, v.bulmacaId, 'Sağ alttaki çift çok güzeldi'), { durum: 'yayinda' });
  await assert.rejects(yorumEkle(db, u, v.bulmacaId, 'ikinci yorum'), /30 saniye/);
  await db.sorgu(`UPDATE yorumlar SET olusturma = now() - interval '1 minute'`);
  await assert.rejects(yorumEkle(db, u, v.bulmacaId, 's.i.k.t.i.r git'), /kurallarına/);
  assert.deepEqual(await yorumEkle(db, u, v.bulmacaId, 'bu bulmaca salak gibi'), { durum: 'onay-bekliyor' });
  const herkes = await yorumlar(db, v.bulmacaId, null);
  assert.equal(herkes.length, 1, 'onay bekleyen yorumu başkaları görmez');
  const kendisi = await yorumlar(db, v.bulmacaId, u);
  assert.equal(kendisi.length, 2);
  assert.equal(kendisi[0].sure, 590);
});

test('filtre: masum kelimeler geçer, gizlenmiş küfür yakalanır', () => {
  for (const temiz of ['amca geldi', 'götür bunu', 'sikke koleksiyonu', 'Tamam, çözdüm!', 'X-Wing harika']) assert.equal(filtrele(temiz), 'temiz', temiz);
  for (const agir of ['s1kt1r', 'ORRROSPU', 'a m k', 'amk']) assert.equal(filtrele(agir), 'agir', agir);
  assert.equal(filtrele('beni ara 0532 123 45 67'), 'iletisim');
  assert.equal(filtrele('www.site.com'), 'iletisim');
});

test('günün sudokusu: her gün bir Zor bulmaca, aynı gün aynı', async () => {
  const a = await gununBulmacasi(db, '2026-11-24');
  assert.equal(await gununBulmacasi(db, '2026-11-24'), a);
  const b = await gununBulmacasi(db, '2026-11-25');
  assert.notEqual(a, b);
  const [{ seviye }] = await db.sorgu<{ seviye: string }>(`SELECT seviye FROM bulmacalar WHERE id = $1`, [a]);
  assert.equal(seviye, 'zor');
});

test('ipucu sınırı: bir bulmacada en fazla 3 ipucu sayılır', async () => {
  const { oyuncu: o } = await misafirOlustur(db, '10.77.77.77');
  const v = await oyunVer(db, o, 'kolay');
  await db.sorgu(`UPDATE oyunlar SET baslangic = now() - interval '20 minutes' WHERE id = $1`, [v.oyunId]);
  const s = await oyunBitir(db, o, v.oyunId, { cevap: cozumKaristir(v.cozumK, v.oyunId), sure: 600, hata: 0, ipucu: 9 });
  assert.equal(s.ipucu, 3);
});
