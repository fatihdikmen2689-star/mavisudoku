/**
 * Sunucu tarafı doğrulama: oyuncunun gönderdiği çözümü kontrol eder.
 * Sıralamaya giren her skor buradan geçer; tarayıcıdan gelen veriye güvenilmez.
 */

import { metindenIzgara, cakismaVarMi } from './izgara.ts';
import { cozumSay } from './cozucu.ts';

export type DogrulamaHatasi =
  | 'boyut-uyusmuyor'
  | 'verilen-degistirilmis'
  | 'eksik-hucre'
  | 'cakisma'
  | 'cozum-yanlis';

export interface DogrulamaSonucu {
  gecerli: boolean;
  hata?: DogrulamaHatasi;
}

/**
 * @param bulmacaMetni Başlangıç ızgarası
 * @param cevapMetni   Oyuncunun doldurduğu tam ızgara
 * @param cozumMetni   Kayıtlı çözüm (verilmezse çözücüyle kontrol edilir)
 */
export function cozumuDogrula(bulmacaMetni: string, cevapMetni: string, cozumMetni?: string): DogrulamaSonucu {
  const b = metindenIzgara(bulmacaMetni);
  let c: number[];
  try {
    c = metindenIzgara(cevapMetni);
  } catch {
    return { gecerli: false, hata: 'boyut-uyusmuyor' };
  }
  if (b.length !== c.length) return { gecerli: false, hata: 'boyut-uyusmuyor' };
  for (let i = 0; i < b.length; i++) {
    if (b[i] && b[i] !== c[i]) return { gecerli: false, hata: 'verilen-degistirilmis' };
    if (!c[i]) return { gecerli: false, hata: 'eksik-hucre' };
  }
  if (cakismaVarMi(c)) return { gecerli: false, hata: 'cakisma' };
  if (cozumMetni) {
    if (cozumMetni !== cevapMetni) return { gecerli: false, hata: 'cozum-yanlis' };
  } else if (cozumSay(b, 2) !== 1) {
    return { gecerli: false, hata: 'cozum-yanlis' };
  }
  return { gecerli: true };
}
