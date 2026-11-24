import Link from 'next/link';

export default function Bulunamadi() {
  return (
    <main className="sayfa">
      <section className="kart" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: 40 }}>
        <p style={{ margin: 0, fontSize: 64, fontWeight: 900, color: 'var(--mavi)' }}>404</p>
        <h1 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 900, color: 'var(--lacivert)' }}>Bu sayfa bulunamadı</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--soluk)' }}>Aradığın sayfa taşınmış ya da hiç olmamış olabilir.</p>
        <Link className="ana-btn" href="/">Ana sayfaya dön</Link>
      </section>
    </main>
  );
}
