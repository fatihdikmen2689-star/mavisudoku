import Link from 'next/link';
import { Reklam } from '../../bilesenler/Reklam.tsx';
import type { Metadata } from 'next';
import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';
import { TAKTIKLER } from '../../lib/taktikler.ts';
import { SEVIYE_UI } from '../../lib/bicim.ts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sudoku taktikleri',
  description: 'Sudoku nasıl oynanır, tek aday, gizli tekli, işaretleme, çıplak çift ve X-Wing. Örnek ızgaralarla adım adım Türkçe sudoku teknikleri.',
  alternates: { canonical: '/taktikler' },
};

export default async function Taktikler() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif="taktikler" />
      <main className="sayfa" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <header style={{ maxWidth: 720 }}>
          <h1 style={{ margin: '6px 0 10px', fontSize: 34, fontWeight: 700, color: 'var(--lacivert)' }}>Sudoku taktikleri</h1>
          <p style={{ margin: 0, fontSize: 17, color: '#3B4A60' }}>Kolaydan Usta seviyeye, her adımda bir teknik. Yazıları sırayla okursan her seviyenin gerektirdiği yöntemi tam zamanında öğrenmiş olursun.</p>
        </header>
        <div className="taktik-liste">
          {TAKTIKLER.map((t, i) => (
            <Link key={t.slug} className="taktik-kart" href={`/taktikler/${t.slug}`}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="rozet" style={{ background: SEVIYE_UI[t.seviye].renk, color: '#fff' }}>{SEVIYE_UI[t.seviye].ad}</span>
                <span>{i + 1}. adım</span>
              </span>
              <b>{t.baslik}</b>
              <span>{t.ozet}</span>
            </Link>
          ))}
        </div>
        <Reklam yer="icerik" />
      </main>
    </>
  );
}
