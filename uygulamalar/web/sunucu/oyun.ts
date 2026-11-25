/**
 * Oyun servisi: bulmaca dağıtımı, bitirme, puan, sıralama, seri, günün sudokusu.
 * Kurallar (proje özeti):
 *  - Bir oyuncu bir bulmacayı yalnızca bir kez açar; açtığı an "oynandı" sayılır.
 *  - Önce başkalarının oynadığı ama bu oyuncunun açmadığı bulmacalar verilir (en çok oynanan önce).
 *  - Sıralamaya yalnızca ilk deneme ve insanca bir sürede doğru çözülen oyunlar girer.
 *  - Süre sunucuda da ölçülür; tarayıcının bildirdiği süre sunucu süresini aşamaz.
 */

import { SEVIYELER, SEVIYE_SIRASI, puanHesapla, cozumuDogrula, bulmacaUret, EN_FAZLA_IPUCU } from '@mavisudoku/motor';
import type { SeviyeId } from '@mavisudoku/motor';
import type { Veritabani } from './db.ts';
import type { Oyuncu } from './kimlik.ts';
import { buYil } from './kimlik.ts';

export class OyunHatasi extends Error {
  durum: number;
  constructor(mesaj: string, durum = 400) {
    super(mesaj);
    this.durum = durum;
  }
}

export const seviyeMi = (s: unknown): s is SeviyeId => typeof s === 'string' && (SEVIYE_SIRASI as string[]).includes(s);

/** Oyuncunun sütunu ve kimliği (SQL'de kullanmak için) */
function sahip(o: Oyuncu): { sutun: 'kullanici_id' | 'misafir_id'; id: number } {
  return o.tip === 'uye' ? { sutun: 'kullanici_id', id: o.id } : { sutun: 'misafir_id', id: o.id };
}

/** Çözüm tarayıcıya düz metin gönderilmez; oyun numarasıyla basit bir karıştırma yapılır. */
export function cozumKaristir(cozum: string, anahtar: number): string {
  return [...cozum].map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (((anahtar * 31 + i * 17) % 23) + 1))).join('');
}

export interface VerilenOyun {
  oyunId: number;
  bulmacaId: number;
  seviye: SeviyeId;
  bulmaca: string;
  cozumK: string;
  gecenSaniye: number;
  devam: boolean;
}

interface OyunSatiri { id: number; bulmaca_id: number; seviye: string; bulmaca: string; cozum: string; gecen: number; bitis: Date | null }

const OYUN_SEC = `SELECT o.id::int AS id, o.bulmaca_id, b.seviye, b.bulmaca, b.cozum, o.bitis,
  floor(extract(epoch FROM now() - o.baslangic))::int AS gecen
  FROM oyunlar o JOIN bulmacalar b ON b.id = o.bulmaca_id`;

function cikti(s: OyunSatiri, devam: boolean): VerilenOyun {
  return {
    oyunId: s.id, bulmacaId: s.bulmaca_id, seviye: s.seviye as SeviyeId, bulmaca: s.bulmaca,
    cozumK: cozumKaristir(s.cozum, s.id), gecenSaniye: s.gecen, devam,
  };
}

async function oyunAc(db: Veritabani, o: Oyuncu, bulmacaId: number): Promise<VerilenOyun> {
  const { sutun, id } = sahip(o);
  const r = await db.sorgu<{ id: number }>(
    `INSERT INTO oyunlar (bulmaca_id, ${sutun}) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id::int AS id`, [bulmacaId, id]);
  if (r.length) await db.sorgu(`UPDATE bulmacalar SET oynanma = oynanma + 1 WHERE id = $1`, [bulmacaId]);
  const s = await db.sorgu<OyunSatiri>(`${OYUN_SEC} WHERE o.bulmaca_id = $1 AND o.${sutun} = $2`, [bulmacaId, id]);
  return cikti(s[0], !r.length);
}

/**
 * Oyuncuya bir bulmaca verir.
 * - `bulmacaId` verilirse o bulmaca (daha önce bitirdiyse hata).
 * - Yoksa bu seviyede yarım kalan oyun varsa o, yoksa daha önce açmadığı yeni bir bulmaca.
 */
export async function oyunVer(db: Veritabani, o: Oyuncu, seviye: SeviyeId, bulmacaId?: number, yeniIste = false): Promise<VerilenOyun> {
  const { sutun, id } = sahip(o);
  if (bulmacaId) {
    const b = await db.sorgu<{ seviye: string }>(`SELECT seviye FROM bulmacalar WHERE id = $1`, [bulmacaId]);
    if (!b.length) throw new OyunHatasi('Bulmaca bulunamadı.', 404);
    const onceki = await db.sorgu<OyunSatiri>(`${OYUN_SEC} WHERE o.bulmaca_id = $1 AND o.${sutun} = $2`, [bulmacaId, id]);
    if (onceki.length && onceki[0].bitis) throw new OyunHatasi('Bu bulmacayı zaten çözdün. Her bulmaca bir kez oynanır.', 409);
    return oyunAc(db, o, bulmacaId);
  }
  if (!yeniIste) {
    const yarim = await db.sorgu<OyunSatiri>(
      `${OYUN_SEC} WHERE o.${sutun} = $1 AND o.bitis IS NULL AND b.seviye = $2 AND NOT EXISTS (SELECT 1 FROM maclar m WHERE m.bulmaca_id = o.bulmaca_id AND m.durum = 'basladi') ORDER BY o.baslangic DESC LIMIT 1`, [id, seviye]);
    if (yarim.length) return cikti(yarim[0], true);
  }
  for (let deneme = 0; deneme < 3; deneme++) {
    const aday = await db.sorgu<{ id: number }>(
      `SELECT b.id FROM bulmacalar b
       WHERE b.seviye = $1 AND NOT EXISTS (SELECT 1 FROM oyunlar o WHERE o.bulmaca_id = b.id AND o.${sutun} = $2)
         AND NOT EXISTS (SELECT 1 FROM gunluk g WHERE g.bulmaca_id = b.id AND g.tarih >= $3::date)
       ORDER BY b.oynanma DESC, b.id LIMIT 1`, [seviye, id, bugun()]);
    if (aday.length) return oyunAc(db, o, aday[0].id);
    // Havuz bitti: anında yeni bulmaca üret (gerçekte arka planda havuz doldurulur)
    await havuzaBulmacaEkle(db, seviye);
  }
  throw new OyunHatasi('Şu an yeni bulmaca hazırlanamadı, birazdan tekrar dene.', 503);
}

/** Havuza yeni bir bulmaca üretip ekler (havuz tükendiğinde) */
export async function havuzaBulmacaEkle(db: Veritabani, seviye: SeviyeId): Promise<number | null> {
  const yeni = bulmacaUret(seviye, Math.floor(Math.random() * 2 ** 31));
  if (!yeni) return null;
  const r = await db.sorgu<{ id: number }>(
    `INSERT INTO bulmacalar (seviye, bulmaca, cozum, ipucu, tohum) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (bulmaca) DO NOTHING RETURNING id`,
    [seviye, yeni.bulmaca, yeni.cozum, yeni.ipucuSayisi, yeni.tohum]);
  return r[0]?.id ?? null;
}

export interface BitirGirdisi { cevap: string; sure: number; hata: number; ipucu: number }

export interface BittiSonucu {
  bulmacaId: number;
  seviye: SeviyeId;
  sure: number;
  puan: number;
  hata: number;
  ipucu: number;
  siralamada: boolean;
  sira: number | null;
  toplam: number;
  oncekiEnIyi: number | null;
  rekor: boolean;
  seri: number;
  cozulenSeviyede: number;
}

const tamSayi = (v: unknown, enAz: number, enCok: number) => Math.min(enCok, Math.max(enAz, Math.floor(Number(v) || 0)));

export async function oyunBitir(db: Veritabani, o: Oyuncu, oyunId: number, g: BitirGirdisi): Promise<BittiSonucu> {
  const { sutun, id } = sahip(o);
  const r = await db.sorgu<OyunSatiri>(`${OYUN_SEC} WHERE o.id = $1 AND o.${sutun} = $2`, [oyunId, id]);
  if (!r.length) throw new OyunHatasi('Oyun bulunamadı.', 404);
  const oyun = r[0];
  if (oyun.bitis) throw new OyunHatasi('Bu oyun zaten bitti.', 409);
  const dogru = cozumuDogrula(oyun.bulmaca, String(g.cevap ?? ''), oyun.cozum);
  if (!dogru.gecerli) throw new OyunHatasi('Çözüm doğru değil.', 422);
  const seviye = oyun.seviye as SeviyeId;
  const sure = tamSayi(g.sure, 1, oyun.gecen + 5); // sunucu süresinden uzun olamaz (duraklatmalar düşülmüş olabilir)
  const hata = tamSayi(g.hata, 0, 999);
  const ipucu = tamSayi(g.ipucu, 0, EN_FAZLA_IPUCU);
  const p = puanHesapla({ seviye, sureSaniye: sure, hata, ipucu });

  const onceki = await db.sorgu<{ en_iyi: number | null }>(
    `SELECT min(o.sure) AS en_iyi FROM oyunlar o JOIN bulmacalar b ON b.id = o.bulmaca_id
     WHERE o.${sutun} = $1 AND o.bitis IS NOT NULL AND b.seviye = $2`, [id, seviye]);
  const oncekiEnIyi = onceki[0]?.en_iyi ?? null;

  await db.sorgu(`UPDATE oyunlar SET bitis = now(), sure = $2, hata = $3, ipucu = $4, puan = $5, siralamada = $6 WHERE id = $1`,
    [oyunId, sure, hata, ipucu, p.puan, p.siralamayaUygun]);
  await db.sorgu(`UPDATE bulmacalar SET cozulme = cozulme + 1 WHERE id = $1`, [oyun.bulmaca_id]);

  const [{ toplam }] = await db.sorgu<{ toplam: number }>(
    `SELECT count(*)::int AS toplam FROM oyunlar WHERE bulmaca_id = $1 AND siralamada`, [oyun.bulmaca_id]);
  let sira: number | null = null;
  if (p.siralamayaUygun) {
    const [{ once }] = await db.sorgu<{ once: number }>(
      `SELECT count(*)::int AS once FROM oyunlar WHERE bulmaca_id = $1 AND siralamada AND id <> $2
       AND (puan > $3 OR (puan = $3 AND sure < $4))`, [oyun.bulmaca_id, oyunId, p.puan, sure]);
    sira = once + 1;
  }
  const [{ cozulen }] = await db.sorgu<{ cozulen: number }>(
    `SELECT count(*)::int AS cozulen FROM oyunlar o JOIN bulmacalar b ON b.id = o.bulmaca_id
     WHERE o.${sutun} = $1 AND o.bitis IS NOT NULL AND b.seviye = $2`, [id, seviye]);
  return {
    bulmacaId: oyun.bulmaca_id, seviye, sure, puan: p.puan, hata, ipucu,
    siralamada: p.siralamayaUygun, sira, toplam,
    oncekiEnIyi, rekor: oncekiEnIyi !== null && sure < oncekiEnIyi,
    seri: await seriHesapla(db, o), cozulenSeviyede: cozulen,
  };
}

/** İstanbul saatine göre bugünün tarihi (YYYY-AA-GG) */
export function bugun(tarih = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tarih);
}

/** Üst üste kaç gün en az bir bulmaca çözüldü (bugün veya dün biten seri sayılır) */
export async function seriHesapla(db: Veritabani, o: Oyuncu): Promise<number> {
  const { sutun, id } = sahip(o);
  const r = await db.sorgu<{ gun: string }>(
    `SELECT DISTINCT to_char((bitis AT TIME ZONE 'Europe/Istanbul')::date, 'YYYY-MM-DD') AS gun FROM oyunlar
     WHERE ${sutun} = $1 AND bitis IS NOT NULL ORDER BY gun DESC LIMIT 400`, [id]);
  const gunler = new Set(r.map((x) => x.gun));
  const gun = (geri: number) => bugun(new Date(Date.now() - geri * 86400000));
  let bas = gunler.has(gun(0)) ? 0 : gunler.has(gun(1)) ? 1 : -1;
  if (bas < 0) return 0;
  let seri = 0;
  while (gunler.has(gun(bas + seri))) seri++;
  return seri;
}

export interface SiralamaSatiri {
  sira: number;
  ad: string;
  misafir: boolean;
  yas: number | null;
  sure: number;
  hata: number;
  puan: number;
  benim: boolean;
}

/** Bir bulmacanın sıralaması. 18 yaş altı üyelerin yalnızca rumuzu görünür, yaşı gösterilmez. */
export interface AdSatiri {
  kullanici_id: number | null; rumuz: string | null; ad: string | null; soyad: string | null;
  dogum_yili: number | null; gorunen: string | null; yas_goster: boolean | null; misafir_ad: string | null;
}

/** Sıralamada görünen ad ve yaş: kullanıcının seçimi; 18 yaş altında yalnızca rumuz, yaş gizli */
export function siralamaAdi(s: AdSatiri): { ad: string; yas: number | null } {
  const yas = s.dogum_yili ? buYil() - s.dogum_yili : null;
  const yetiskin = yas !== null && yas >= 18;
  if (!s.kullanici_id) return { ad: s.misafir_ad ?? 'misafir', yas: null };
  return { ad: yetiskin && s.gorunen === 'adsoyad' ? `${s.ad} ${s.soyad}` : s.rumuz!, yas: yetiskin && s.yas_goster ? yas : null };
}

export async function bulmacaSiralamasi(db: Veritabani, bulmacaId: number, ben: Oyuncu | null, limit = 50): Promise<SiralamaSatiri[]> {
  const r = await db.sorgu<{
    kullanici_id: number | null; misafir_id: number | null; sure: number; hata: number; puan: number;
    rumuz: string | null; ad: string | null; soyad: string | null; dogum_yili: number | null; gorunen: string | null; yas_goster: boolean | null; misafir_ad: string | null;
  }>(
    `SELECT o.kullanici_id, o.misafir_id, o.sure, o.hata, o.puan, k.rumuz, k.ad, k.soyad, k.dogum_yili, k.gorunen, k.yas_goster, m.ad AS misafir_ad
     FROM oyunlar o LEFT JOIN kullanicilar k ON k.id = o.kullanici_id LEFT JOIN misafirler m ON m.id = o.misafir_id
     WHERE o.bulmaca_id = $1 AND o.siralamada ORDER BY o.puan DESC, o.sure ASC, o.id ASC LIMIT $2`, [bulmacaId, limit]);
  return r.map((s, i) => {
    const { ad, yas } = siralamaAdi(s);
    return {
      sira: i + 1, ad, misafir: !s.kullanici_id, yas,
      sure: s.sure, hata: s.hata, puan: s.puan,
      benim: !!ben && (ben.tip === 'uye' ? s.kullanici_id === ben.id : s.misafir_id === ben.id),
    };
  });
}

export interface BulmacaBilgisi {
  id: number;
  seviye: SeviyeId;
  bulmaca: string;
  cozulme: number;
  ortalamaSure: number | null;
  rekor: number | null;
  yorumSayisi: number;
  gunlukTarih: string | null;
}

export async function bulmacaBilgisi(db: Veritabani, id: number): Promise<BulmacaBilgisi | null> {
  const r = await db.sorgu<{ id: number; seviye: string; bulmaca: string; ort: number | null; rekor: number | null; cozulme: number; yorum: number; gunluk: string | null }>(
    `SELECT b.id, b.seviye, b.bulmaca,
       (SELECT count(*)::int FROM oyunlar o WHERE o.bulmaca_id = b.id AND o.bitis IS NOT NULL) AS cozulme,
       (SELECT round(avg(sure))::int FROM oyunlar o WHERE o.bulmaca_id = b.id AND o.siralamada) AS ort,
       (SELECT min(sure) FROM oyunlar o WHERE o.bulmaca_id = b.id AND o.siralamada) AS rekor,
       (SELECT count(*)::int FROM yorumlar y WHERE y.bulmaca_id = b.id AND y.durum = 'yayinda') AS yorum,
       (SELECT to_char(min(tarih), 'YYYY-MM-DD') FROM gunluk g WHERE g.bulmaca_id = b.id) AS gunluk
     FROM bulmacalar b WHERE b.id = $1`, [id]);
  if (!r.length) return null;
  const s = r[0];
  return { id: s.id, seviye: s.seviye as SeviyeId, bulmaca: s.bulmaca, cozulme: s.cozulme, ortalamaSure: s.ort, rekor: s.rekor, yorumSayisi: s.yorum, gunlukTarih: s.gunluk };
}

/** Oyuncu bu bulmacayı bitirdi mi / açtı mı? */
export async function oyunDurumu(db: Veritabani, o: Oyuncu | null, bulmacaId: number): Promise<'yok' | 'yarim' | 'bitti'> {
  if (!o) return 'yok';
  const { sutun, id } = sahip(o);
  const r = await db.sorgu<{ bitis: Date | null }>(`SELECT bitis FROM oyunlar WHERE bulmaca_id = $1 AND ${sutun} = $2`, [bulmacaId, id]);
  return !r.length ? 'yok' : r[0].bitis ? 'bitti' : 'yarim';
}

/** Günün sudokusu: her gün için bir "Zor" bulmaca seçilir ve o gün herkes aynısını çözer. */
export async function gununBulmacasi(db: Veritabani, tarih = bugun()): Promise<number> {
  const var_ = await db.sorgu<{ bulmaca_id: number }>(`SELECT bulmaca_id FROM gunluk WHERE tarih = $1::date`, [tarih]);
  if (var_.length) return var_[0].bulmaca_id;
  await db.sorgu(
    `INSERT INTO gunluk (tarih, bulmaca_id)
     SELECT $1::date, b.id FROM bulmacalar b
     WHERE b.seviye = 'zor' AND NOT EXISTS (SELECT 1 FROM gunluk g WHERE g.bulmaca_id = b.id)
     ORDER BY b.oynanma ASC, b.id ASC LIMIT 1
     ON CONFLICT DO NOTHING`, [tarih]);
  const r = await db.sorgu<{ bulmaca_id: number }>(`SELECT bulmaca_id FROM gunluk WHERE tarih = $1::date`, [tarih]);
  if (!r.length) throw new OyunHatasi('Günün sudokusu hazırlanamadı.', 503);
  return r[0].bulmaca_id;
}

export interface OyuncuOzeti {
  seri: number;
  seviyeler: Partial<Record<SeviyeId, { cozulen: number; enIyi: number | null }>>;
  yarim: { seviye: SeviyeId; bulmacaId: number; acilis: string } | null;
}

export async function oyuncuOzeti(db: Veritabani, o: Oyuncu | null): Promise<OyuncuOzeti> {
  if (!o) return { seri: 0, seviyeler: {}, yarim: null };
  const { sutun, id } = sahip(o);
  const r = await db.sorgu<{ seviye: string; cozulen: number; en_iyi: number | null }>(
    `SELECT b.seviye, count(*)::int AS cozulen, min(o.sure) AS en_iyi FROM oyunlar o JOIN bulmacalar b ON b.id = o.bulmaca_id
     WHERE o.${sutun} = $1 AND o.bitis IS NOT NULL GROUP BY b.seviye`, [id]);
  const y = await db.sorgu<{ seviye: string; bulmaca_id: number; baslangic: Date }>(
    `SELECT b.seviye, o.bulmaca_id, o.baslangic FROM oyunlar o JOIN bulmacalar b ON b.id = o.bulmaca_id
     WHERE o.${sutun} = $1 AND o.bitis IS NULL AND NOT EXISTS (SELECT 1 FROM maclar m WHERE m.bulmaca_id = o.bulmaca_id AND m.durum = 'basladi') ORDER BY o.baslangic DESC LIMIT 1`, [id]);
  const seviyeler: OyuncuOzeti['seviyeler'] = {};
  for (const s of r) seviyeler[s.seviye as SeviyeId] = { cozulen: s.cozulen, enIyi: s.en_iyi };
  return {
    seri: await seriHesapla(db, o),
    seviyeler,
    yarim: y.length ? { seviye: y[0].seviye as SeviyeId, bulmacaId: y[0].bulmaca_id, acilis: new Date(y[0].baslangic).toISOString() } : null,
  };
}

export const seviyeAdi = (s: SeviyeId) => SEVIYELER[s].ad;
