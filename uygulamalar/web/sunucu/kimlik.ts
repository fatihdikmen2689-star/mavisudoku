/**
 * Kimlik: misafirler, üyelik, oturumlar.
 * - Şifreler scrypt ile tuzlanıp saklanır; düz şifre asla tutulmaz.
 * - Oturum ve misafir çerezleri rastgele jetondur; veritabanında yalnızca SHA-256 özeti durur.
 */

import { randomBytes, scrypt, timingSafeEqual, createHash, randomInt } from 'node:crypto';
import { promisify } from 'node:util';
import type { Veritabani } from './db.ts';
import { filtrele } from './filtre.ts';

const scryptP = promisify(scrypt) as (sifre: string, tuz: Buffer, uzunluk: number, ayar: object) => Promise<Buffer>;

export const OTURUM_GUN = 30;
export const MISAFIR_GUNLUK_IP_SINIRI = 30;

export type Oyuncu =
  | { tip: 'uye'; id: number; rumuz: string; ad: string; soyad: string }
  | { tip: 'misafir'; id: number; ad: string };

export class KimlikHatasi extends Error {
  alan?: string;
  constructor(mesaj: string, alan?: string) {
    super(mesaj);
    this.alan = alan;
  }
}

export const ozet = (metin: string) => createHash('sha256').update(metin).digest('hex');
export const jetonUret = () => randomBytes(32).toString('base64url');

export async function sifreOzetle(sifre: string): Promise<string> {
  const tuz = randomBytes(16);
  const h = await scryptP(sifre.normalize('NFKC'), tuz, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${tuz.toString('base64')}$${h.toString('base64')}`;
}

export async function sifreDogrula(sifre: string, kayitli: string): Promise<boolean> {
  const [tur, n, tuz, h] = kayitli.split('$');
  if (tur !== 'scrypt') return false;
  const beklenen = Buffer.from(h, 'base64');
  const gelen = await scryptP(sifre.normalize('NFKC'), Buffer.from(tuz, 'base64'), beklenen.length, { N: Number(n), r: 8, p: 1 });
  return timingSafeEqual(beklenen, gelen);
}

// ---------------- Misafir ----------------

export async function misafirOlustur(db: Veritabani, ip: string): Promise<{ oyuncu: Oyuncu; jeton: string }> {
  const ipOzet = ozet('ip:' + ip);
  const [{ sayi }] = await db.sorgu<{ sayi: number }>(
    `SELECT count(*)::int AS sayi FROM misafirler WHERE ip_ozet = $1 AND olusturma > now() - interval '1 day'`, [ipOzet]);
  if (sayi >= MISAFIR_GUNLUK_IP_SINIRI) throw new KimlikHatasi('Bu bağlantıdan bugün çok fazla misafir oluşturuldu. Lütfen kayıt ol veya yarın tekrar dene.');
  const jeton = jetonUret();
  for (let deneme = 0; deneme < 20; deneme++) {
    const basamak = deneme < 10 ? 4 : 6;
    const ad = 'misafir' + randomInt(10 ** (basamak - 1), 10 ** basamak);
    const r = await db.sorgu<{ id: number }>(
      `INSERT INTO misafirler (token_ozet, ad, ip_ozet) VALUES ($1, $2, $3) ON CONFLICT (ad) DO NOTHING RETURNING id`,
      [ozet(jeton), ad, ipOzet]);
    if (r.length) return { oyuncu: { tip: 'misafir', id: r[0].id, ad }, jeton };
  }
  throw new Error('Misafir adı üretilemedi');
}

export async function misafirBul(db: Veritabani, jeton: string | undefined): Promise<Oyuncu | null> {
  if (!jeton) return null;
  const r = await db.sorgu<{ id: number; ad: string }>(
    `SELECT id, ad FROM misafirler WHERE token_ozet = $1 AND aktarilan_kullanici IS NULL`, [ozet(jeton)]);
  return r.length ? { tip: 'misafir', id: r[0].id, ad: r[0].ad } : null;
}

// ---------------- Üyelik ----------------

export interface KayitGirdisi {
  eposta: string;
  sifre: string;
  ad: string;
  soyad: string;
  rumuz: string;
  dogumYili: number;
  gorunen: 'rumuz' | 'adsoyad';
  yasGoster: boolean;
  kvkk: boolean;
  pazarlama: boolean;
}

export const AD_DESENI = /^[\p{L}][\p{L}\s.'-]{0,39}$/u;
export const RUMUZ_DESENI = /^[a-z0-9_.]{3,20}$/;

export function buYil(): number {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(new Date()));
}

/** Rumuz kurallara uyuyor mu? Uymuyorsa nedenini döndürür. */
export function rumuzSorunu(rumuz: string): string | null {
  if (!RUMUZ_DESENI.test(rumuz)) return 'Rumuz 3–20 karakter olmalı; yalnızca küçük harf (a–z), rakam, nokta ve alt çizgi kullanılabilir.';
  if (rumuz.startsWith('misafir')) return 'Rumuz "misafir" ile başlayamaz.';
  if (filtrele(rumuz.replace(/[._]/g, ' ')) !== 'temiz' || filtrele(rumuz) !== 'temiz') return 'Bu rumuz kullanılamaz.';
  return null;
}

export async function rumuzMusait(db: Veritabani, rumuz: string): Promise<{ musait: boolean; neden?: string }> {
  const temiz = rumuz.trim().toLowerCase();
  const sorun = rumuzSorunu(temiz);
  if (sorun) return { musait: false, neden: sorun };
  const r = await db.sorgu(`SELECT 1 FROM kullanicilar WHERE rumuz = $1`, [temiz]);
  return r.length ? { musait: false, neden: 'Bu rumuz alınmış.' } : { musait: true };
}

export async function kayitOl(db: Veritabani, g: KayitGirdisi): Promise<Oyuncu> {
  const eposta = String(g.eposta ?? '').trim().toLowerCase();
  const ad = String(g.ad ?? '').trim().replace(/\s+/g, ' ');
  const soyad = String(g.soyad ?? '').trim().replace(/\s+/g, ' ');
  const rumuz = String(g.rumuz ?? '').trim().toLowerCase();
  const sifre = String(g.sifre ?? '');
  const yil = Number(g.dogumYili);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta) || eposta.length > 120) throw new KimlikHatasi('Geçerli bir e-posta adresi yaz.', 'eposta');
  if (sifre.length < 8 || sifre.length > 200) throw new KimlikHatasi('Şifre en az 8 karakter olmalı.', 'sifre');
  if (!AD_DESENI.test(ad)) throw new KimlikHatasi('Adını yaz.', 'ad');
  if (!AD_DESENI.test(soyad)) throw new KimlikHatasi('Soyadını yaz.', 'soyad');
  if (filtrele(`${ad} ${soyad}`) === 'agir') throw new KimlikHatasi('Bu ad kullanılamaz.', 'ad');
  const sorun = rumuzSorunu(rumuz);
  if (sorun) throw new KimlikHatasi(sorun, 'rumuz');
  const yil0 = buYil();
  if (!Number.isInteger(yil) || yil < yil0 - 110 || yil > yil0) throw new KimlikHatasi('Doğum yılını seç.', 'dogumYili');
  if (yil0 - yil < 13) throw new KimlikHatasi('MaviSudoku\'ya üye olmak için en az 13 yaşında olmalısın. Üye olmadan misafir olarak oynayabilirsin.', 'dogumYili');
  if (g.kvkk !== true) throw new KimlikHatasi('Devam etmek için kullanım koşullarını ve KVKK aydınlatma metnini onaylamalısın.', 'kvkk');
  const r1 = await db.sorgu(`SELECT eposta, rumuz FROM kullanicilar WHERE eposta = $1 OR rumuz = $2`, [eposta, rumuz]);
  const var_ = r1[0] as { eposta: string; rumuz: string } | undefined;
  if (var_?.eposta === eposta) throw new KimlikHatasi('Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.', 'eposta');
  if (var_) throw new KimlikHatasi('Bu rumuz alınmış.', 'rumuz');
  const sifreOzet = await sifreOzetle(sifre);
  const r = await db.sorgu<{ id: number }>(
    `INSERT INTO kullanicilar (eposta, sifre_ozet, ad, soyad, rumuz, dogum_yili, gorunen, yas_goster, pazarlama, kvkk_onay)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now()) RETURNING id`,
    [eposta, sifreOzet, ad, soyad, rumuz, yil, g.gorunen === 'adsoyad' ? 'adsoyad' : 'rumuz', g.yasGoster === true, g.pazarlama === true]);
  return { tip: 'uye', id: r[0].id, rumuz, ad, soyad };
}

export async function girisYap(db: Veritabani, kimlikAdi: string, sifre: string): Promise<Oyuncu | null> {
  const k = String(kimlikAdi ?? '').trim().toLowerCase();
  const r = await db.sorgu<{ id: number; rumuz: string; ad: string; soyad: string; sifre_ozet: string }>(
    `SELECT id, rumuz, ad, soyad, sifre_ozet FROM kullanicilar WHERE eposta = $1 OR rumuz = $1`, [k]);
  if (!r.length) {
    await sifreOzetle(String(sifre ?? '')); // zamanlama farkıyla hesap varlığı anlaşılmasın
    return null;
  }
  if (!(await sifreDogrula(String(sifre ?? ''), r[0].sifre_ozet))) return null;
  return { tip: 'uye', id: r[0].id, rumuz: r[0].rumuz, ad: r[0].ad, soyad: r[0].soyad };
}

export async function oturumAc(db: Veritabani, kullaniciId: number): Promise<string> {
  const jeton = jetonUret();
  await db.sorgu(`INSERT INTO oturumlar (token_ozet, kullanici_id, bitis) VALUES ($1, $2, now() + interval '${OTURUM_GUN} days')`,
    [ozet(jeton), kullaniciId]);
  return jeton;
}

export async function oturumBul(db: Veritabani, jeton: string | undefined): Promise<Oyuncu | null> {
  if (!jeton) return null;
  const r = await db.sorgu<{ id: number; rumuz: string; ad: string; soyad: string }>(
    `SELECT k.id, k.rumuz, k.ad, k.soyad FROM oturumlar o JOIN kullanicilar k ON k.id = o.kullanici_id
     WHERE o.token_ozet = $1 AND o.bitis > now()`, [ozet(jeton)]);
  return r.length ? { tip: 'uye', ...r[0] } : null;
}

export async function oturumKapat(db: Veritabani, jeton: string | undefined): Promise<void> {
  if (jeton) await db.sorgu(`DELETE FROM oturumlar WHERE token_ozet = $1`, [ozet(jeton)]);
}

/**
 * Misafirin oyunlarını üyeye aktarır. Üye aynı bulmacayı daha önce oynadıysa onun kaydı korunur.
 * Aktarılan misafir bir daha kullanılamaz.
 */
export async function misafirAktar(db: Veritabani, misafirId: number, kullaniciId: number): Promise<number> {
  return db.islem(async (tx) => {
    await tx.sorgu(
      `DELETE FROM oyunlar m WHERE m.misafir_id = $1
       AND EXISTS (SELECT 1 FROM oyunlar u WHERE u.kullanici_id = $2 AND u.bulmaca_id = m.bulmaca_id)`,
      [misafirId, kullaniciId]);
    const r = await tx.sorgu(`UPDATE oyunlar SET kullanici_id = $2, misafir_id = NULL WHERE misafir_id = $1 RETURNING id`,
      [misafirId, kullaniciId]);
    await tx.sorgu(`UPDATE misafirler SET aktarilan_kullanici = $2 WHERE id = $1`, [misafirId, kullaniciId]);
    return r.length;
  });
}
