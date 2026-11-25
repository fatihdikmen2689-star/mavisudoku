import Link from 'next/link';
import { CerezTercihButonu } from './CerezTercihButonu.tsx';

export function AltBilgi() {
  return (
    <footer className="alt">
      <div className="alt-ic">
        <span style={{ fontWeight: 900, color: 'var(--lacivert)' }}>Mavi<span style={{ color: 'var(--mavi)' }}>Sudoku</span> <span style={{ fontWeight: 700, color: 'var(--soluk)' }}>· {new Date().getFullYear()}</span></span>
        <nav aria-label="Alt bilgi">
          <Link href="/hakkimizda">Hakkımızda</Link>
          <Link href="/iletisim">İletişim</Link>
          <Link href="/sudoku-kurallari">Sudoku kuralları</Link>
          <Link href="/gizlilik">Gizlilik politikası</Link>
          <Link href="/cerezler">Çerez politikası</Link>
          <Link href="/kullanim-kosullari">Kullanım koşulları</Link>
          <CerezTercihButonu />
        </nav>
      </div>
    </footer>
  );
}
