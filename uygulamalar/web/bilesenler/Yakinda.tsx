import Link from 'next/link';

export function Yakinda({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <main className="sayfa">
      <section className="kart" style={{ maxWidth: 640, margin: '20px auto', textAlign: 'center', padding: 40 }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 700, color: 'var(--lacivert)' }}>{baslik}</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--soluk)', fontSize: 16 }}>{metin}</p>
        <Link className="ana-btn" href="/oyna/kolay">Bu arada bir bulmaca çöz</Link>
      </section>
    </main>
  );
}
