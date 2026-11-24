import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { UstMenu } from '../../../bilesenler/UstMenu.tsx';
import { OyunEkrani } from '../../../bilesenler/OyunEkrani.tsx';
import { mevcutOyuncu } from '../../../sunucu/istek.ts';
import { veritabani } from '../../../sunucu/db.ts';
import { macDurumu } from '../../../sunucu/mac.ts';
import { OyunHatasi } from '../../../sunucu/oyun.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Maç', robots: { index: false } };

const MESAJ = { bekliyor: 'Arkadaşın daveti henüz kabul etmedi.', reddedildi: 'Davet reddedildi.', iptal: 'Davet iptal edildi.', 'suresi-doldu': 'Davetin süresi doldu.', basladi: 'Maç bulunamadı.' } as const;

export default async function MacSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const oyuncu = await mevcutOyuncu();
  if (oyuncu?.tip !== 'uye') redirect('/giris');
  let d;
  try {
    d = await macDurumu(await veritabani(), oyuncu, id);
  } catch (e) {
    if (e instanceof OyunHatasi && e.durum === 404) notFound();
    throw e;
  }
  if (d.durum !== 'basladi' || !d.bulmacaId) {
    return (
      <>
        <UstMenu oyuncu={oyuncu} aktif="arkadas" />
        <main className="sayfa"><section className="kart" style={{ maxWidth: 560, margin: '30px auto', textAlign: 'center', padding: 36 }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 900, color: 'var(--lacivert)' }}>{MESAJ[d.durum]}</h1>
          <Link className="ana-btn" href="/arkadas">Arkadaşla oyna sayfasına dön</Link>
        </section></main>
      </>
    );
  }
  return (
    <>
      <UstMenu oyuncu={oyuncu} aktif="arkadas" />
      <OyunEkrani seviye={d.seviye} bulmacaId={d.bulmacaId} ozet={{ cozulen: 0, enIyi: null }} uye mac={{ id: d.id, rakip: d.rakip.rumuz }} />
    </>
  );
}
