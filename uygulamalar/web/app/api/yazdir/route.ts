import { cocukPdf } from '../../../sunucu/yazdir.ts';

export const runtime = 'nodejs';

export async function GET(istek: Request) {
  const p = new URL(istek.url).searchParams;
  const boyut = p.get('boyut') === '6' ? 6 : 4;
  const sayfa = Math.min(10, Math.max(1, Number.parseInt(p.get('sayfa') ?? '1', 10) || 1));
  const verilen = Number.parseInt(p.get('tohum') ?? '', 10);
  const tohum = Number.isFinite(verilen) && verilen >= 0 ? verilen % 2 ** 31 : Math.floor(Math.random() * 2 ** 31);
  const pdf = await cocukPdf({ boyut, sayfa, tohum });
  return new Response(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="mavisudoku-cocuk-${boyut}x${boyut}-${tohum}.pdf"`,
      // Aynı tohum her zaman aynı PDF'i verir; önbelleğe alınabilir
      'Cache-Control': Number.isFinite(verilen) ? 'public, max-age=86400, immutable' : 'no-store',
    },
  });
}
