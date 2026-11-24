import type { MetadataRoute } from 'next';
import { TAKTIKLER } from '../lib/taktikler.ts';
import { veritabani } from '../sunucu/db.ts';
import { SEVIYE_SIRASI } from '@mavisudoku/motor';

export const dynamic = 'force-dynamic';

export default async function siteHaritasi(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL ?? 'https://mavisudoku.com';
  const sabit = ['', '/gunluk', '/taktikler', '/yazdirilabilir', '/sudoku-kurallari', '/hakkimizda', '/iletisim', '/gizlilik', '/cerezler', '/kullanim-kosullari'];
  const db = await veritabani();
  // En çok çözülen bulmacalar: sıralaması ve yorumları olan sayfalar
  const rows = await db.sorgu<{ id: number }>('SELECT id FROM bulmacalar WHERE cozulme > 0 ORDER BY cozulme DESC LIMIT 1000');
  return [
    ...sabit.map((y) => ({ url: site + y, changeFrequency: y === '' || y === '/gunluk' ? 'daily' as const : 'monthly' as const, priority: y === '' ? 1 : 0.7 })),
    ...SEVIYE_SIRASI.map((s) => ({ url: `${site}/oyna/${s}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...TAKTIKLER.map((t) => ({ url: `${site}/taktikler/${t.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...rows.map((r) => ({ url: `${site}/bulmaca/${r.id}`, changeFrequency: 'weekly' as const, priority: 0.4 })),
  ];
}
