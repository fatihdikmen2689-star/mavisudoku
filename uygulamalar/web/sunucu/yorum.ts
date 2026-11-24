/**
 * Bulmaca yorumları. Kurallar:
 *  - Yalnızca üyeler ve yalnızca bulmacayı bitirmiş olanlar yorum yazabilir (çözüm ipuçları bitirenler arasında kalır).
 *  - Ağır küfür reddedilir; hafif ifade veya bağlantı/telefon içeren yorumlar onaya düşer (Moderatör ajanı inceler).
 *  - Aynı kişi 30 saniyede bir yorum yazabilir.
 */

import type { Veritabani } from './db.ts';
import type { Oyuncu } from './kimlik.ts';
import { filtrele } from './filtre.ts';
import { OyunHatasi } from './oyun.ts';
import { buYil } from './kimlik.ts';

export const YORUM_EN_UZUN = 500;

export interface Yorum {
  id: number;
  ad: string;
  metin: string;
  begeni: number;
  tarih: string;
  sure: number | null;
  benim: boolean;
  durum: 'yayinda' | 'onay-bekliyor';
}

export async function yorumlar(db: Veritabani, bulmacaId: number, ben: Oyuncu | null, limit = 50): Promise<Yorum[]> {
  const benimId = ben?.tip === 'uye' ? ben.id : -1;
  const r = await db.sorgu<{ id: number; kullanici_id: number; rumuz: string; ad: string; soyad: string; dogum_yili: number; gorunen: string; metin: string; begeni: number; olusturma: Date; durum: string; sure: number | null }>(
    `SELECT y.id, y.kullanici_id, k.rumuz, k.ad, k.soyad, k.dogum_yili, k.gorunen, y.metin, y.begeni, y.olusturma, y.durum,
       (SELECT o.sure FROM oyunlar o WHERE o.bulmaca_id = y.bulmaca_id AND o.kullanici_id = y.kullanici_id) AS sure
     FROM yorumlar y JOIN kullanicilar k ON k.id = y.kullanici_id
     WHERE y.bulmaca_id = $1 AND (y.durum = 'yayinda' OR (y.durum = 'onay-bekliyor' AND y.kullanici_id = $2))
     ORDER BY y.olusturma DESC LIMIT $3`, [bulmacaId, benimId, limit]);
  const yil = buYil();
  return r.map((y) => ({
    id: y.id,
    ad: yil - y.dogum_yili >= 18 && y.gorunen === 'adsoyad' ? `${y.ad} ${y.soyad}` : y.rumuz,
    metin: y.metin,
    begeni: y.begeni,
    tarih: new Date(y.olusturma).toISOString(),
    sure: y.sure,
    benim: y.kullanici_id === benimId,
    durum: y.durum as Yorum['durum'],
  }));
}

export async function yorumEkle(db: Veritabani, o: Oyuncu | null, bulmacaId: number, metinHam: string): Promise<{ durum: 'yayinda' | 'onay-bekliyor' }> {
  if (!o || o.tip !== 'uye') throw new OyunHatasi('Yorum yazmak için üye olmalısın.', 401);
  const metin = String(metinHam ?? '').replace(/\s+/g, ' ').trim();
  if (metin.length < 2) throw new OyunHatasi('Yorum çok kısa.');
  if (metin.length > YORUM_EN_UZUN) throw new OyunHatasi(`Yorum en fazla ${YORUM_EN_UZUN} karakter olabilir.`);
  const bitirdi = await db.sorgu(`SELECT 1 FROM oyunlar WHERE bulmaca_id = $1 AND kullanici_id = $2 AND bitis IS NOT NULL`, [bulmacaId, o.id]);
  if (!bitirdi.length) throw new OyunHatasi('Yorum yazmak için önce bu bulmacayı bitirmelisin.', 403);
  const son = await db.sorgu(`SELECT 1 FROM yorumlar WHERE kullanici_id = $1 AND olusturma > now() - interval '30 seconds'`, [o.id]);
  if (son.length) throw new OyunHatasi('Biraz yavaş: 30 saniye sonra tekrar yorum yazabilirsin.', 429);
  const f = filtrele(metin);
  if (f === 'agir') throw new OyunHatasi('Yorumun topluluk kurallarına uymuyor.', 422);
  const durum = f === 'temiz' ? 'yayinda' : 'onay-bekliyor';
  await db.sorgu(`INSERT INTO yorumlar (bulmaca_id, kullanici_id, metin, durum) VALUES ($1, $2, $3, $4)`, [bulmacaId, o.id, metin, durum]);
  return { durum };
}
