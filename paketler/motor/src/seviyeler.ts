/**
 * Seviye tanımları, puan hesabı ve hile sınırı.
 * Bu değerler proje özetindeki kararlara göre belirlendi; yayından sonra
 * gerçek oyuncu süreleri toplandıkça Analiz ajanının önerileriyle güncellenebilir.
 */

import type { Boyut } from './izgara.ts';

export type SeviyeId = 'mini4' | 'mini6' | 'kolay' | 'orta' | 'zor' | 'uzman' | 'usta' | 'ekstrem';

export interface Seviye {
  id: SeviyeId;
  ad: string;
  boyut: Boyut;
  /** Taban puan */
  taban: number;
  /** Ortalama bir oyuncu için hedef süre (saniye); bunun altında bitirene süre bonusu verilir */
  hedefSaniye: number;
  /** Bu sürenin altındaki çözümler insan dışı sayılır ve sıralamaya alınmaz */
  enAzSaniye: number;
}

export const SEVIYELER: Record<SeviyeId, Seviye> = {
  mini4: { id: 'mini4', ad: 'Mini 4×4', boyut: 4, taban: 30, hedefSaniye: 90, enAzSaniye: 6 },
  mini6: { id: 'mini6', ad: 'Mini 6×6', boyut: 6, taban: 60, hedefSaniye: 240, enAzSaniye: 15 },
  kolay: { id: 'kolay', ad: 'Kolay', boyut: 9, taban: 100, hedefSaniye: 360, enAzSaniye: 45 },
  orta: { id: 'orta', ad: 'Orta', boyut: 9, taban: 200, hedefSaniye: 600, enAzSaniye: 70 },
  zor: { id: 'zor', ad: 'Zor', boyut: 9, taban: 400, hedefSaniye: 900, enAzSaniye: 100 },
  uzman: { id: 'uzman', ad: 'Uzman', boyut: 9, taban: 700, hedefSaniye: 1320, enAzSaniye: 150 },
  usta: { id: 'usta', ad: 'Usta', boyut: 9, taban: 1000, hedefSaniye: 1800, enAzSaniye: 200 },
  ekstrem: { id: 'ekstrem', ad: 'Ekstrem', boyut: 9, taban: 1500, hedefSaniye: 2400, enAzSaniye: 240 },
};

/** Bir bulmacada alınabilecek en fazla ipucu (web, mobil ve sunucu aynı sınırı kullanır) */
export const EN_FAZLA_IPUCU = 3;

export const SEVIYE_SIRASI: SeviyeId[] = ['mini4', 'mini6', 'kolay', 'orta', 'zor', 'uzman', 'usta', 'ekstrem'];

export interface PuanGirdisi {
  seviye: SeviyeId;
  sureSaniye: number;
  hata: number;
  ipucu: number;
}

export interface PuanSonucu {
  puan: number;
  /** false ise skor sıralamaya alınmaz (insan için imkânsız derecede hızlı) */
  siralamayaUygun: boolean;
}

/**
 * Puan = taban × süre çarpanı − hata cezası − ipucu cezası (en az tabanın %10'u).
 * Süre çarpanı: hedef süre / harcanan süre, 0,5 ile 2 arasında sınırlı.
 * Hata cezası tabanın %10'u, ipucu cezası tabanın %15'idir.
 */
export function puanHesapla(g: PuanGirdisi): PuanSonucu {
  const s = SEVIYELER[g.seviye];
  const sure = Math.max(1, g.sureSaniye);
  const carpan = Math.min(2, Math.max(0.5, s.hedefSaniye / sure));
  const ham = s.taban * carpan - g.hata * s.taban * 0.1 - g.ipucu * s.taban * 0.15;
  const puan = Math.round(Math.max(s.taban * 0.1, ham));
  return { puan, siralamayaUygun: g.sureSaniye >= s.enAzSaniye };
}
