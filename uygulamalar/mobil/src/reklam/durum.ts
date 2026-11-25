/** Reklamların istenebilir olup olmadığı (onay alındıktan ve SDK başlatıldıktan sonra true) */
type Dinleyici = (hazir: boolean) => void;
let hazir = false;
const dinleyiciler = new Set<Dinleyici>();

export const reklamHazirMi = () => hazir;
export function reklamHazirAyarla(d: boolean) { hazir = d; dinleyiciler.forEach((f) => f(d)); }
export function reklamDinle(f: Dinleyici): () => void { dinleyiciler.add(f); return () => { dinleyiciler.delete(f); }; }
