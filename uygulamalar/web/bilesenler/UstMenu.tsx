import Link from 'next/link';
import type { Oyuncu } from '../sunucu/kimlik.ts';
import { CikisButonu } from './CikisButonu.tsx';

export type MenuAktif = 'gunluk' | 'seviyeler' | 'siralama' | 'taktikler' | 'yazdirilabilir' | null;

const MENU: { id: Exclude<MenuAktif, null>; ad: string; href: string }[] = [
  { id: 'gunluk', ad: 'Günlük Sudoku', href: '/gunluk' },
  { id: 'seviyeler', ad: 'Seviyeler', href: '/#seviyeler' },
  { id: 'siralama', ad: 'Sıralama', href: '/siralama' },
  { id: 'taktikler', ad: 'Taktikler', href: '/taktikler' },
  { id: 'yazdirilabilir', ad: 'Yazdırılabilir', href: '/yazdirilabilir' },
];

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="MaviSudoku ana sayfa">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect x="1" y="1" width="32" height="32" rx="8" fill="#2F7BF5" />
        <path d="M12 1v32M22 1v32M1 12h32M1 22h32" stroke="#0B2545" strokeWidth="1.5" />
        <text x="17" y="22" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">9</text>
      </svg>
      <b style={{ fontWeight: 900 }}>Mavi<span>Sudoku</span></b>
    </Link>
  );
}

export function UstMenu({ oyuncu, aktif = null, seri = 0 }: { oyuncu: Oyuncu | null; aktif?: MenuAktif; seri?: number }) {
  return (
    <header className="ust">
      <div className="ust-ic">
        <Logo />
        <nav className="menu" aria-label="Ana menü">
          {MENU.map((m) => (
            <Link key={m.id} href={m.href} aria-current={aktif === m.id ? 'page' : undefined}>{m.ad}</Link>
          ))}
        </nav>
        <div className="ust-sag">
          {oyuncu?.tip === 'uye' ? (
            <>
              {seri > 0 && <span className="seri" title="Günlük seri"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFA24C" strokeWidth="2.2" aria-hidden="true"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 3 3 3" /></svg>{seri} gün</span>}
              <Link className="cip" href="/profil"><i aria-hidden="true">{oyuncu.rumuz.charAt(0).toUpperCase()}</i>{oyuncu.rumuz}</Link>
              <CikisButonu />
            </>
          ) : (
            <>
              {oyuncu && <span className="cip misafir"><i aria-hidden="true">?</i>{oyuncu.ad}</span>}
              <Link className="btn-cizgi" href="/giris">Giriş yap</Link>
              <Link className="btn-mavi" href="/kayit">Ücretsiz kayıt ol</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
