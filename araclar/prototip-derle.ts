/**
 * Prototip sayfayı tek bir HTML dosyası olarak derler (paket kurulumu gerektirmez).
 * TypeScript tipleri Node'un yerleşik stripTypeScriptTypes işleviyle silinir,
 * modüller tek bir betikte birleştirilir, bulmaca havuzu sayfaya gömülür.
 * Kullanım: node araclar/prototip-derle.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const kok = new URL('../', import.meta.url);
const oku = (yol: string) => readFileSync(new URL(yol, kok), 'utf8');

function modul(yol: string): string {
  const js = stripTypeScriptTypes(oku(yol), { mode: 'strip' });
  return js
    .replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+(?=(const|function|let|class|async))/gm, '');
}

const motor = ['paketler/motor/src/izgara.ts', 'paketler/motor/src/seviyeler.ts'].map(modul).join('\n');
const oyun = modul('uygulamalar/web-prototip/oyun.ts');
const havuz = JSON.parse(oku('veri/havuz.json')).havuz as Record<string, { id: string; bulmaca: string; cozum: string; ipucu: number }[]>;
const kucukHavuz = Object.fromEntries(Object.entries(havuz).map(([s, l]) => [s, l.map(({ id, bulmaca, cozum, ipucu }) => ({ id, bulmaca, cozum, ipucu }))]));

const html = oku('uygulamalar/web-prototip/sablon.html')
  .replace('/*HAVUZ*/', () => JSON.stringify(kucukHavuz))
  .replace('/*OYUN*/', () => motor + '\n' + oyun);
mkdirSync(new URL('dagitim/', kok), { recursive: true });
writeFileSync(new URL('dagitim/tek-basina.html', kok), html);
console.log('Yazıldı: dagitim/tek-basina.html', Math.round(html.length / 1024), 'KB');
