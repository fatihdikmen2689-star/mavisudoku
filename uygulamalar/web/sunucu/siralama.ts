/**
 * Genel sıralama: dönem içinde sıralamaya giren çözümlerin puanları toplanır.
 * Dönemler Türkiye saatine göredir: bugün (gece yarısından beri), bu hafta (pazartesiden beri), tüm zamanlar.
 */
import type { Veritabani } from './db.ts';
import type { Oyuncu } from './kimlik.ts';
import { siralamaAdi, type AdSatiri } from './oyun.ts';

export type Donem = 'gun' | 'hafta' | 'tum';
export const DONEMLER: Donem[] = ['gun', 'hafta', 'tum'];
export const donemMi = (d: unknown): d is Donem => typeof d === 'string' && (DONEMLER as string[]).includes(d);

export interface GenelSatir { sira: number; ad: string; misafir: boolean; yas: number | null; puan: number; cozulen: number; benim: boolean }

const BASLANGIC: Record<Donem, string> = {
  gun: `(date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul')`,
  hafta: `(date_trunc('week', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul')`,
  tum: `'-infinity'::timestamptz`,
};

/** İlk `limit` sıra ve listede yoksa oyuncunun kendi satırı (en sonda) */
export async function genelSiralama(db: Veritabani, donem: Donem, ben: Oyuncu | null, limit = 100): Promise<GenelSatir[]> {
  const benK = ben?.tip === 'uye' ? ben.id : null, benM = ben?.tip === 'misafir' ? ben.id : null;
  const r = await db.sorgu<AdSatiri & { misafir_id: number | null; puan: number; cozulen: number; sira: number }>(
    `WITH t AS (
       SELECT o.kullanici_id, o.misafir_id, sum(o.puan)::int AS puan, count(*)::int AS cozulen, max(o.bitis) AS son
       FROM oyunlar o WHERE o.siralamada AND o.bitis >= ${BASLANGIC[donem]}
       GROUP BY o.kullanici_id, o.misafir_id
     ), s AS (
       SELECT t.*, row_number() OVER (ORDER BY t.puan DESC, t.cozulen DESC, t.son ASC)::int AS sira FROM t
     )
     SELECT s.kullanici_id, s.misafir_id, s.puan, s.cozulen, s.sira,
            k.rumuz, k.ad, k.soyad, k.dogum_yili, k.gorunen, k.yas_goster, m.ad AS misafir_ad
     FROM s LEFT JOIN kullanicilar k ON k.id = s.kullanici_id LEFT JOIN misafirler m ON m.id = s.misafir_id
     WHERE s.sira <= $1 OR s.kullanici_id = $2 OR s.misafir_id = $3
     ORDER BY s.sira`, [limit, benK, benM]);
  return r.map((s) => {
    const { ad, yas } = siralamaAdi(s);
    return {
      sira: s.sira, ad, yas, misafir: !s.kullanici_id, puan: s.puan, cozulen: s.cozulen,
      benim: (benK !== null && s.kullanici_id === benK) || (benM !== null && s.misafir_id === benM),
    };
  });
}
