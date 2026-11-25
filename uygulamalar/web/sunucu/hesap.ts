/**
 * Üye hesabı: profil bilgileri, ayarlar, şifre değiştirme/sıfırlama, verileri indirme ve hesabı silme.
 */
import type { SeviyeId } from '@mavisudoku/motor';
import type { Veritabani } from './db.ts';
import type { Oyuncu } from './kimlik.ts';
import { KimlikHatasi, AD_DESENI, buYil, ozet, jetonUret, sifreOzetle, sifreDogrula } from './kimlik.ts';
import { OyunHatasi, seriHesapla } from './oyun.ts';
import { filtrele } from './filtre.ts';
import { epostaGonder, sablon } from './eposta.ts';

export const SIFIRLAMA_DAKIKA = 60;
const SAATLIK_SIFIRLAMA_EPOSTA = 3;
const SAATLIK_SIFIRLAMA_IP = 10;

type Uye = Extract<Oyuncu, { tip: 'uye' }>;
function uyeGerekli(o: Oyuncu | null): Uye {
  if (!o || o.tip !== 'uye') throw new OyunHatasi('Bu işlem için giriş yapmalısın.', 401);
  return o;
}

export interface Profil {
  rumuz: string; ad: string; soyad: string; eposta: string; dogumYili: number; yas: number; yetiskin: boolean;
  gorunen: 'rumuz' | 'adsoyad'; yasGoster: boolean; pazarlama: boolean; uyelik: string;
  seri: number; toplamPuan: number; cozulen: number;
  seviyeler: { seviye: SeviyeId; cozulen: number; enIyi: number; ortalama: number }[];
  sonOyunlar: { bulmacaId: number; seviye: SeviyeId; sure: number; puan: number; tarih: string }[];
  maclar: { kazanilan: number; kaybedilen: number };
}

export async function profil(db: Veritabani, o: Oyuncu | null): Promise<Profil> {
  const ben = uyeGerekli(o);
  const [k] = await db.sorgu<{ rumuz: string; ad: string; soyad: string; eposta: string; dogum_yili: number; gorunen: 'rumuz' | 'adsoyad'; yas_goster: boolean; pazarlama: boolean; olusturma: Date }>(
    `SELECT rumuz, ad, soyad, eposta, dogum_yili, gorunen, yas_goster, pazarlama, olusturma FROM kullanicilar WHERE id = $1`, [ben.id]);
  if (!k) throw new OyunHatasi('Hesap bulunamadı.', 404);
  const seviyeler = await db.sorgu<{ seviye: SeviyeId; cozulen: number; en_iyi: number; ortalama: number }>(
    `SELECT b.seviye, count(*)::int AS cozulen, min(o.sure)::int AS en_iyi, round(avg(o.sure))::int AS ortalama
     FROM oyunlar o JOIN bulmacalar b ON b.id = o.bulmaca_id WHERE o.kullanici_id = $1 AND o.bitis IS NOT NULL GROUP BY b.seviye`, [ben.id]);
  const [t] = await db.sorgu<{ puan: number; cozulen: number }>(
    `SELECT coalesce(sum(puan) FILTER (WHERE siralamada), 0)::int AS puan, count(*)::int AS cozulen FROM oyunlar WHERE kullanici_id = $1 AND bitis IS NOT NULL`, [ben.id]);
  const son = await db.sorgu<{ bulmaca_id: number; seviye: SeviyeId; sure: number; puan: number; bitis: Date }>(
    `SELECT o.bulmaca_id, b.seviye, o.sure, o.puan, o.bitis FROM oyunlar o JOIN bulmacalar b ON b.id = o.bulmaca_id
     WHERE o.kullanici_id = $1 AND o.bitis IS NOT NULL ORDER BY o.bitis DESC LIMIT 10`, [ben.id]);
  const [m] = await db.sorgu<{ kazanilan: number; kaybedilen: number }>(
    `SELECT count(*) FILTER (WHERE ob.bitis IS NOT NULL AND (orr.bitis IS NULL OR ob.bitis <= orr.bitis))::int AS kazanilan,
            count(*) FILTER (WHERE orr.bitis IS NOT NULL AND (ob.bitis IS NULL OR orr.bitis < ob.bitis))::int AS kaybedilen
     FROM maclar m
     JOIN oyunlar ob ON ob.bulmaca_id = m.bulmaca_id AND ob.kullanici_id = $1
     JOIN oyunlar orr ON orr.bulmaca_id = m.bulmaca_id AND orr.kullanici_id = CASE WHEN m.davet_eden = $1 THEN m.davet_edilen ELSE m.davet_eden END
     WHERE m.durum = 'basladi' AND $1 IN (m.davet_eden, m.davet_edilen)`, [ben.id]);
  const yas = buYil() - k.dogum_yili;
  return {
    rumuz: k.rumuz, ad: k.ad, soyad: k.soyad, eposta: k.eposta, dogumYili: k.dogum_yili, yas, yetiskin: yas >= 18,
    gorunen: k.gorunen, yasGoster: k.yas_goster, pazarlama: k.pazarlama, uyelik: new Date(k.olusturma).toISOString(),
    seri: await seriHesapla(db, ben), toplamPuan: t.puan, cozulen: t.cozulen,
    seviyeler: seviyeler.map((s) => ({ seviye: s.seviye, cozulen: s.cozulen, enIyi: s.en_iyi, ortalama: s.ortalama })),
    sonOyunlar: son.map((s) => ({ bulmacaId: s.bulmaca_id, seviye: s.seviye, sure: s.sure, puan: s.puan, tarih: new Date(s.bitis).toISOString() })),
    maclar: m,
  };
}

export interface AyarGirdisi { ad?: unknown; soyad?: unknown; gorunen?: unknown; yasGoster?: unknown; pazarlama?: unknown }

/** Ad soyad ve sıralamada görünüm ayarları. 18 yaş altında ad soyad ve yaş gösterilemez. Rumuz ve e-posta değişmez. */
export async function ayarGuncelle(db: Veritabani, o: Oyuncu | null, g: AyarGirdisi): Promise<void> {
  const ben = uyeGerekli(o);
  const ad = String(g.ad ?? '').trim().replace(/\s+/g, ' ');
  const soyad = String(g.soyad ?? '').trim().replace(/\s+/g, ' ');
  if (!AD_DESENI.test(ad)) throw new KimlikHatasi('Adını yaz.', 'ad');
  if (!AD_DESENI.test(soyad)) throw new KimlikHatasi('Soyadını yaz.', 'soyad');
  if (filtrele(`${ad} ${soyad}`) === 'agir') throw new KimlikHatasi('Bu ad kullanılamaz.', 'ad');
  const [{ dogum_yili }] = await db.sorgu<{ dogum_yili: number }>(`SELECT dogum_yili FROM kullanicilar WHERE id = $1`, [ben.id]);
  const yetiskin = buYil() - dogum_yili >= 18;
  await db.sorgu(`UPDATE kullanicilar SET ad = $2, soyad = $3, gorunen = $4, yas_goster = $5, pazarlama = $6 WHERE id = $1`,
    [ben.id, ad, soyad, yetiskin && g.gorunen === 'adsoyad' ? 'adsoyad' : 'rumuz', yetiskin && g.yasGoster === true, g.pazarlama === true]);
}

/** Şifre değişince bu oturum dışındaki bütün oturumlar kapanır */
export async function sifreDegistir(db: Veritabani, o: Oyuncu | null, eski: unknown, yeni: unknown, mevcutJeton: string | undefined): Promise<void> {
  const ben = uyeGerekli(o);
  const [{ sifre_ozet }] = await db.sorgu<{ sifre_ozet: string }>(`SELECT sifre_ozet FROM kullanicilar WHERE id = $1`, [ben.id]);
  if (!(await sifreDogrula(String(eski ?? ''), sifre_ozet))) throw new KimlikHatasi('Mevcut şifren yanlış.', 'eski');
  const y = String(yeni ?? '');
  if (y.length < 8 || y.length > 200) throw new KimlikHatasi('Yeni şifre en az 8 karakter olmalı.', 'yeni');
  await db.sorgu(`UPDATE kullanicilar SET sifre_ozet = $2 WHERE id = $1`, [ben.id, await sifreOzetle(y)]);
  await db.sorgu(`DELETE FROM oturumlar WHERE kullanici_id = $1 AND token_ozet <> $2`, [ben.id, mevcutJeton ? ozet(mevcutJeton) : '']);
}

/** KVKK: hesabı ve ona bağlı her şeyi (oyunlar, yorumlar, maçlar, oturumlar) kalıcı olarak siler */
export async function hesapSil(db: Veritabani, o: Oyuncu | null, sifre: unknown, onay: unknown): Promise<void> {
  const ben = uyeGerekli(o);
  if (String(onay ?? '').trim().toLocaleUpperCase('tr') !== 'SİL') throw new KimlikHatasi('Onaylamak için kutuya SİL yaz.', 'onay');
  const [{ sifre_ozet }] = await db.sorgu<{ sifre_ozet: string }>(`SELECT sifre_ozet FROM kullanicilar WHERE id = $1`, [ben.id]);
  if (!(await sifreDogrula(String(sifre ?? ''), sifre_ozet))) throw new KimlikHatasi('Şifren yanlış.', 'sifre');
  await db.sorgu(`DELETE FROM kullanicilar WHERE id = $1`, [ben.id]);
}

/** KVKK: kişinin hakkında tuttuğumuz verilerin kopyası */
export async function verilerim(db: Veritabani, o: Oyuncu | null): Promise<Record<string, unknown>> {
  const ben = uyeGerekli(o);
  const [hesap] = await db.sorgu(`SELECT eposta, ad, soyad, rumuz, dogum_yili, gorunen, yas_goster, pazarlama, kvkk_onay, olusturma FROM kullanicilar WHERE id = $1`, [ben.id]);
  const oyunlar = await db.sorgu(`SELECT bulmaca_id, baslangic, bitis, sure, hata, ipucu, puan, siralamada FROM oyunlar WHERE kullanici_id = $1 ORDER BY baslangic`, [ben.id]);
  const yorumlar = await db.sorgu(`SELECT bulmaca_id, metin, durum, olusturma FROM yorumlar WHERE kullanici_id = $1 ORDER BY olusturma`, [ben.id]);
  const maclar = await db.sorgu(
    `SELECT m.id, m.seviye, m.durum, m.bulmaca_id, m.olusturma, ke.rumuz AS davet_eden, kd.rumuz AS davet_edilen
     FROM maclar m JOIN kullanicilar ke ON ke.id = m.davet_eden JOIN kullanicilar kd ON kd.id = m.davet_edilen
     WHERE $1 IN (m.davet_eden, m.davet_edilen) ORDER BY m.olusturma`, [ben.id]);
  return { olusturma: new Date().toISOString(), hesap, oyunlar, yorumlar, maclar };
}

/**
 * Şifre sıfırlama isteği. Hesap var mı yok mu belli olmasın diye her durumda aynı yanıt verilir.
 * Sınırlar: aynı hesaba saatte 3, aynı IP'den saatte 10 istek.
 */
export async function sifreSifirlamaIste(db: Veritabani, epostaGirdisi: unknown, ip: string, site: string): Promise<void> {
  const eposta = String(epostaGirdisi ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) throw new KimlikHatasi('Geçerli bir e-posta adresi yaz.', 'eposta');
  const ipOzet = ozet(`ip:${ip}`);
  const [{ n }] = await db.sorgu<{ n: number }>(`SELECT count(*)::int AS n FROM sifre_sifirlama WHERE ip_ozet = $1 AND olusturma > now() - interval '1 hour'`, [ipOzet]);
  if (n >= SAATLIK_SIFIRLAMA_IP) throw new OyunHatasi('Çok fazla deneme yapıldı. Bir saat sonra tekrar dene.', 429);
  const k = await db.sorgu<{ id: number; ad: string }>(`SELECT id, ad FROM kullanicilar WHERE eposta = $1`, [eposta]);
  if (!k.length) {
    await db.sorgu(`SELECT pg_sleep(0.05)`); // var/yok ayrımı zamanlamadan anlaşılmasın
    return;
  }
  const [{ m }] = await db.sorgu<{ m: number }>(`SELECT count(*)::int AS m FROM sifre_sifirlama WHERE kullanici_id = $1 AND olusturma > now() - interval '1 hour'`, [k[0].id]);
  if (m >= SAATLIK_SIFIRLAMA_EPOSTA) return; // sessizce yok say: posta kutusu doldurulmasın
  const jeton = jetonUret();
  await db.sorgu(`INSERT INTO sifre_sifirlama (token_ozet, kullanici_id, ip_ozet, bitis) VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [ozet(jeton), k[0].id, ipOzet, SIFIRLAMA_DAKIKA]);
  const adres = `${site}/sifre-yenile?jeton=${jeton}`;
  await epostaGonder({
    kime: eposta,
    konu: 'MaviSudoku şifreni yenile',
    metin: `Merhaba ${k[0].ad},\n\nŞifreni yenilemek için bu bağlantıyı aç (1 saat geçerli):\n${adres}\n\nBu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.\n\nMaviSudoku`,
    html: sablon('Şifreni yenile', [`Merhaba ${k[0].ad},`, 'Hesabın için şifre yenileme isteği aldık. Aşağıdaki düğmeyle yeni şifreni belirleyebilirsin. Bağlantı 1 saat geçerli ve tek kullanımlık.'],
      { metin: 'Yeni şifre belirle', adres }, 'Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.'),
  });
}

export async function sifirlamaJetonuGecerli(db: Veritabani, jeton: unknown): Promise<boolean> {
  if (typeof jeton !== 'string' || jeton.length < 20 || jeton.length > 100) return false;
  const r = await db.sorgu(`SELECT 1 FROM sifre_sifirlama WHERE token_ozet = $1 AND NOT kullanildi AND bitis > now()`, [ozet(jeton)]);
  return r.length > 0;
}

/** Jetonla yeni şifre belirler; jeton kullanılır, bütün oturumlar ve diğer jetonlar kapanır. Kullanıcı kimliği döner. */
export async function sifreYenile(db: Veritabani, jeton: unknown, yeni: unknown): Promise<number> {
  const y = String(yeni ?? '');
  if (y.length < 8 || y.length > 200) throw new KimlikHatasi('Yeni şifre en az 8 karakter olmalı.', 'sifre');
  if (typeof jeton !== 'string' || jeton.length > 100) throw new OyunHatasi('Bağlantı geçersiz ya da süresi dolmuş. Yeni bağlantı iste.', 400);
  const sifreOzet = await sifreOzetle(y);
  return db.islem(async (tx) => {
    const r = await tx.sorgu<{ kullanici_id: number }>(
      `UPDATE sifre_sifirlama SET kullanildi = TRUE WHERE token_ozet = $1 AND NOT kullanildi AND bitis > now() RETURNING kullanici_id`, [ozet(jeton)]);
    if (!r.length) throw new OyunHatasi('Bağlantı geçersiz ya da süresi dolmuş. Yeni bağlantı iste.', 400);
    const id = r[0].kullanici_id;
    await tx.sorgu(`UPDATE kullanicilar SET sifre_ozet = $2 WHERE id = $1`, [id, sifreOzet]);
    await tx.sorgu(`DELETE FROM oturumlar WHERE kullanici_id = $1`, [id]);
    await tx.sorgu(`UPDATE sifre_sifirlama SET kullanildi = TRUE WHERE kullanici_id = $1`, [id]);
    return id;
  });
}
