import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { UstMenu } from '../../../bilesenler/UstMenu.tsx';
import { TaktikIzgara } from '../../../bilesenler/TaktikIzgara.tsx';
import { mevcutOyuncu } from '../../../sunucu/istek.ts';
import { TAKTIKLER, taktikBul } from '../../../lib/taktikler.ts';
import { SEKILLER } from '../../../lib/sekiller.ts';
import { SEVIYE_UI } from '../../../lib/bicim.ts';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = taktikBul((await params).slug);
  return t ? { title: t.baslik, description: t.ozet, alternates: { canonical: `/taktikler/${t.slug}` }, openGraph: { type: 'article', title: t.baslik, description: t.ozet } } : {};
}

export default async function TaktikSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const t = taktikBul((await params).slug);
  if (!t) notFound();
  const sira = TAKTIKLER.indexOf(t);
  const sonraki = TAKTIKLER[sira + 1];
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: t.baslik, description: t.ozet, inLanguage: 'tr', publisher: { '@type': 'Organization', name: 'MaviSudoku' } };
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif="taktikler" />
      <main className="sayfa iki-sutun">
        <article className="ana-sutun makale">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
          <nav aria-label="Konum" style={{ fontSize: 14, color: 'var(--soluk)' }}><Link href="/taktikler">Taktikler</Link> › {t.kisaAd}</nav>
          <span className="rozet" style={{ background: SEVIYE_UI[t.seviye].renk, color: '#fff', alignSelf: 'flex-start' }}>{SEVIYE_UI[t.seviye].ad} seviye</span>
          <h1>{t.baslik}</h1>
          <p className="giris-metni">{t.giris}</p>
          {t.bolumler.map((b, i) => (
            <section key={i}>
              {b.baslik && <h2>{b.baslik}</h2>}
              {b.paragraflar?.map((p, j) => <p key={j}>{p}</p>)}
              {b.liste && (b.numarali
                ? <ol>{b.liste.map((l) => <li key={l}>{l}</li>)}</ol>
                : <ul>{b.liste.map((l) => <li key={l}>{l}</li>)}</ul>)}
              {b.sekil && <TaktikIzgara sekil={SEKILLER[b.sekil]} />}
              {b.not && <p className="not-kutu">{b.not}</p>}
              {i === 1 && <div className="reklam" role="complementary" aria-label="Reklam alanı" style={{ margin: '24px 0' }}>Reklam alanı</div>}
            </section>
          ))}
          <div className="kart" style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ display: 'block', fontSize: 18, color: 'var(--lacivert)' }}>Şimdi dene</strong>
              <span style={{ fontSize: 14, color: 'var(--soluk)' }}>{SEVIYE_UI[t.seviye].ad} seviyede bu tekniği gerektiren bir bulmaca çöz.</span>
            </div>
            <Link className="ana-btn" href={`/oyna/${t.seviye}`}>{SEVIYE_UI[t.seviye].ad} bulmaca çöz</Link>
          </div>
          {sonraki && <p style={{ marginTop: 18 }}>Sıradaki teknik: <Link href={`/taktikler/${sonraki.slug}`} style={{ fontWeight: 800 }}>{sonraki.baslik}</Link></p>}
        </article>
        <aside className="yan-sutun">
          <section className="kart">
            <h2>Tüm taktikler</h2>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TAKTIKLER.map((x) => <li key={x.slug}>{x.slug === t.slug ? <strong>{x.kisaAd}</strong> : <Link href={`/taktikler/${x.slug}`}>{x.kisaAd}</Link>}</li>)}
            </ol>
          </section>
          <div className="reklam uzun" role="complementary" aria-label="Reklam alanı">Reklam alanı</div>
        </aside>
      </main>
    </>
  );
}
