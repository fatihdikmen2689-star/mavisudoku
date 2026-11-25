/** Sunucu yanıtlarının biçimleri (web uygulamasındaki sunucu/*.ts ile aynı) */
import type { SeviyeId } from '@mavisudoku/motor';

export interface VerilenOyun { oyunId: number; bulmacaId: number; seviye: SeviyeId; bulmaca: string; cozumK: string; gecenSaniye: number; devam: boolean }
export interface BittiSonucu {
  bulmacaId: number; seviye: SeviyeId; sure: number; puan: number; hata: number; ipucu: number; siralamada: boolean;
  sira: number | null; toplam: number; oncekiEnIyi: number | null; rekor: boolean; seri: number; cozulenSeviyede: number;
}
export interface SiralamaSatiri { sira: number; ad: string; misafir: boolean; yas: number | null; sure: number; hata: number; puan: number; benim: boolean }
export interface BulmacaBilgisi { id: number; seviye: SeviyeId; bulmaca: string; cozulme: number; ortalamaSure: number | null; rekor: number | null; yorumSayisi: number; gunlukTarih: string | null }
export interface Yorum { id: number; ad: string; metin: string; tarih: string; sure: number | null; durum: string }
export interface Ozet {
  oyuncu: { tip: 'uye' | 'misafir'; ad: string } | null;
  seri: number;
  seviyeler: Partial<Record<SeviyeId, { cozulen: number; enIyi: number | null }>>;
  yarim: { seviye: SeviyeId; bulmacaId: number } | null;
  gunluk: BulmacaBilgisi;
  enHizlilar: SiralamaSatiri[];
}
export interface GenelSatir { sira: number; ad: string; misafir: boolean; yas: number | null; puan: number; cozulen: number; benim: boolean }
export interface Profil {
  rumuz: string; ad: string; soyad: string; eposta: string; yas: number; uyelik: string;
  seri: number; toplamPuan: number; cozulen: number;
  seviyeler: { seviye: SeviyeId; cozulen: number; enIyi: number; ortalama: number }[];
  sonOyunlar: { bulmacaId: number; seviye: SeviyeId; sure: number; puan: number; tarih: string }[];
  maclar: { kazanilan: number; kaybedilen: number };
}
