import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cozumuDogrula } from '@mavisudoku/motor';
import { PDFDocument } from 'pdf-lib';
import { cocukBulmacalari, cocukPdf, yildiz } from '../sunucu/yazdir.ts';

test('çocuk bulmacaları: tekrarsız, kolaydan zora, çözüm geçerli', () => {
  for (const boyut of [4, 6] as const) {
    const l = cocukBulmacalari(boyut, 24, 5);
    assert.equal(l.length, 24);
    assert.equal(new Set(l.map((b) => b.bulmaca)).size, 24);
    for (let i = 1; i < l.length; i++) assert.ok(l[i - 1].ipucu >= l[i].ipucu);
    for (const b of l) {
      assert.equal(b.bulmaca.length, boyut * boyut);
      assert.ok(cozumuDogrula(b.bulmaca, b.cozum).gecerli);
      assert.ok([1, 2, 3].includes(yildiz(b)));
    }
  }
  assert.deepEqual(cocukBulmacalari(4, 6, 9), cocukBulmacalari(4, 6, 9), 'aynı tohum aynı bulmacalar');
});

test('PDF üretimi: sayfa sayısı ve Türkçe yazı tipi', async () => {
  const pdf = await cocukPdf({ boyut: 6, sayfa: 3, tohum: 1 });
  assert.ok(Buffer.from(pdf).toString('latin1').startsWith('%PDF-'));
  const belge = await PDFDocument.load(pdf);
  assert.equal(belge.getPageCount(), 4); // 3 bulmaca + 1 cevap sayfası
  assert.match(belge.getTitle() ?? '', /Çocuklar için 6×6/);
});
