/**
 * Küfür ve hakaret filtresi (temel sürüm).
 * 4. adımda sohbetle birlikte genişletilecek; şimdilik yorumlar ve rumuzlar için kullanılır.
 * Yöntem: metni sadeleştir (Türkçe karakter, 4→a gibi gizleme, tekrar eden harf), sonra
 *  - uzun ve ayırt edici kökleri metnin boşluksuz hâlinde ara,
 *  - kısa kelimeleri yalnızca tek başına bir kelime olarak ara (masum kelimeleri korumak için: "götür", "amca", "sikke").
 */

export type FiltreSonucu = 'temiz' | 'hafif' | 'agir' | 'iletisim';

const AGIR_KOKLER = ['orospu', 'siktir', 'sikis', 'sikik', 'yarrak', 'amcik', 'pezevenk', 'serefsiz', 'kahpe', 'gavat', 'puse'];
const AGIR_KELIMELER = new Set(['amk', 'aq', 'mk', 'oc', 'pic', 'got', 'ibne', 'sik', 'am', 'yarak', 'sikerim', 'amina', 'anani']);
const HAFIF_KELIMELER = new Set(['salak', 'aptal', 'gerizekali', 'mal', 'dangalak', 'ahmak', 'embesil', 'beyinsiz', 'oduncu', 'hiyar', 'ezik']);

export function sadelestir(metin: string): string {
  return metin
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[4@]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't')
    .replace(/(.)\1{2,}/g, '$1');
}

export function filtrele(metin: string): FiltreSonucu {
  const sade = sadelestir(metin);
  const kelimeler = sade.split(/[^a-z]+/).filter(Boolean);
  const bitisik = kelimeler.join('');
  // Harfler arasına nokta/boşluk koyarak gizleme: "s.i.k.t.i.r" → tek harflik kelimeler birleşince yakalanır
  const tekHarfler = sade.split(/[^a-z]+/).filter((k) => k.length === 1).join('');
  if (AGIR_KOKLER.some((k) => bitisik.includes(k) || tekHarfler.includes(k))) return 'agir';
  if (kelimeler.some((k) => AGIR_KELIMELER.has(k)) || (tekHarfler.length >= 2 && AGIR_KELIMELER.has(tekHarfler))) return 'agir';
  if (/https?:|www\.|\.com\b|\.net\b|@\w+\.\w+|(\d[\s.-]?){10,}/i.test(metin)) return 'iletisim';
  if (kelimeler.some((k) => HAFIF_KELIMELER.has(k))) return 'hafif';
  return 'temiz';
}
