/**
 * Izgara yapısı: 4×4 (2×2 kutu), 6×6 (2 satır × 3 sütunluk kutu) ve 9×9 (3×3 kutu).
 * Izgara, satır satır dizilmiş n*n uzunluğunda bir sayı dizisidir; 0 = boş hücre.
 */

export type Boyut = 4 | 6 | 9;
export type Izgara = number[];

export interface Duzen {
  n: Boyut;
  /** Bir kutunun satır sayısı */
  kutuSatir: number;
  /** Bir kutunun sütun sayısı */
  kutuSutun: number;
  /** Her hücrenin satırı, sütunu ve kutusu */
  satirOf: number[];
  sutunOf: number[];
  kutuOf: number[];
  /** 3n birim: önce n satır, sonra n sütun, sonra n kutu (her biri hücre indeksleri) */
  birimler: number[][];
  /** Her hücrenin aynı satır/sütun/kutudaki diğer hücreleri */
  komsular: number[][];
  /** Tüm adayların bit maskesi (n=9 için 0b111111111) */
  tumAdaylar: number;
}

const onbellek = new Map<number, Duzen>();

export function duzen(n: Boyut): Duzen {
  const var_ = onbellek.get(n);
  if (var_) return var_;
  const kutuSatir = n === 9 ? 3 : 2;
  const kutuSutun = n === 4 ? 2 : 3;
  const satirOf: number[] = [];
  const sutunOf: number[] = [];
  const kutuOf: number[] = [];
  const kutuBasina = n / kutuSutun; // bir satırdaki kutu sayısı
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    satirOf.push(r);
    sutunOf.push(c);
    kutuOf.push(Math.floor(r / kutuSatir) * kutuBasina + Math.floor(c / kutuSutun));
  }
  const birimler: number[][] = [];
  for (let r = 0; r < n; r++) birimler.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) birimler.push(Array.from({ length: n }, (_, r) => r * n + c));
  for (let b = 0; b < n; b++) {
    const hucreler: number[] = [];
    for (let i = 0; i < n * n; i++) if (kutuOf[i] === b) hucreler.push(i);
    birimler.push(hucreler);
  }
  const komsular: number[][] = [];
  for (let i = 0; i < n * n; i++) {
    const kume = new Set<number>();
    for (const b of [birimler[satirOf[i]], birimler[n + sutunOf[i]], birimler[2 * n + kutuOf[i]]]) {
      for (const j of b) if (j !== i) kume.add(j);
    }
    komsular.push([...kume]);
  }
  const d: Duzen = { n, kutuSatir, kutuSutun, satirOf, sutunOf, kutuOf, birimler, komsular, tumAdaylar: (1 << n) - 1 };
  onbellek.set(n, d);
  return d;
}

/** "530070000..." gibi bir metinden ızgara oluşturur. '0' veya '.' boş hücredir. */
export function metindenIzgara(metin: string): Izgara {
  const temiz = metin.replace(/\s/g, '');
  const n = Math.round(Math.sqrt(temiz.length));
  if (n * n !== temiz.length || (n !== 4 && n !== 6 && n !== 9)) {
    throw new Error(`Geçersiz ızgara uzunluğu: ${temiz.length}`);
  }
  return [...temiz].map((ch) => {
    if (ch === '.' || ch === '0') return 0;
    const v = Number(ch);
    if (!Number.isInteger(v) || v < 1 || v > n) throw new Error(`Geçersiz karakter: ${ch}`);
    return v;
  });
}

export function izgaraMetni(g: Izgara): string {
  return g.map((v) => String(v)).join('');
}

export function boyutOf(g: Izgara): Boyut {
  const n = Math.round(Math.sqrt(g.length));
  if (n !== 4 && n !== 6 && n !== 9) throw new Error(`Desteklenmeyen boyut: ${g.length}`);
  return n;
}

/** Izgarada aynı satır, sütun veya kutuda tekrar eden rakam var mı? (boş hücreler serbest) */
export function cakismaVarMi(g: Izgara): boolean {
  const d = duzen(boyutOf(g));
  for (const birim of d.birimler) {
    let gorulen = 0;
    for (const i of birim) {
      const v = g[i];
      if (!v) continue;
      const bit = 1 << (v - 1);
      if (gorulen & bit) return true;
      gorulen |= bit;
    }
  }
  return false;
}

/** Izgaradaki dolu hücre sayısı */
export function doluSayisi(g: Izgara): number {
  let s = 0;
  for (const v of g) if (v) s++;
  return s;
}

/** Bit maskesindeki 1 sayısı */
export function bitSay(m: number): number {
  let s = 0;
  while (m) {
    m &= m - 1;
    s++;
  }
  return s;
}

/** Tek bitlik maskeden rakamı (1..n) döndürür */
export function bittenRakam(m: number): number {
  return 31 - Math.clz32(m) + 1;
}
