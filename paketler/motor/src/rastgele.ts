/**
 * Tohumlu (seed) rastgele sayı üreteci.
 * Aynı tohum her zaman aynı bulmacayı üretir; böylece bir bulmaca
 * yalnızca tohum numarasıyla saklanabilir ve sunucuda yeniden üretilebilir.
 */

export type Rastgele = () => number;

/** mulberry32: küçük, hızlı ve oyun için yeterince iyi dağılımlı bir üreteç. */
export function tohumluRastgele(tohum: number): Rastgele {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Diziyi yerinde karıştırır (Fisher–Yates) ve aynı diziyi döndürür. */
export function karistir<T>(dizi: T[], rng: Rastgele): T[] {
  for (let i = dizi.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const g = dizi[i];
    dizi[i] = dizi[j];
    dizi[j] = g;
  }
  return dizi;
}
