import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/nunito';
import './globals.css';
import { AltBilgi } from '../bilesenler/AltBilgi.tsx';
import { CerezBandi } from '../bilesenler/CerezBandi.tsx';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'https://mavisudoku.com'),
  title: { default: 'MaviSudoku · Ücretsiz online sudoku', template: '%s · MaviSudoku' },
  description: 'Her gün yeni bir sudoku. Mini, Kolay, Orta, Zor, Uzman, Usta ve Ekstrem seviyelerde çöz; her bulmacanın kendi sıralamasında yerini gör.',
  openGraph: { siteName: 'MaviSudoku', locale: 'tr_TR', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#0B2545', width: 'device-width', initialScale: 1 };

export default function KokDuzen({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <AltBilgi />
        <CerezBandi />
      </body>
    </html>
  );
}
