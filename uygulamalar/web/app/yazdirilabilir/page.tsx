import Link from 'next/link';
import type { Metadata } from 'next';
import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { MiniIzgara } from '../../bilesenler/MiniIzgara.tsx';
import { YazdirFormu } from '../../bilesenler/YazdirFormu.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';
import { cocukBulmacalari } from '../../sunucu/yazdir.ts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Çocuklar için yazdırılabilir sudoku (PDF)',
  description: 'Çocuklar için 4×4 ve 6×6 yazdırılabilir sudoku. Ücretsiz PDF indir, cevap anahtarı dahil. Her indirmede yeni bulmacalar.',
  alternates: { canonical: '/yazdirilabilir' },
};

// Önizleme her zaman aynı iki bulmacayı gösterir
const ORNEK4 = cocukBulmacalari(4, 1, 2026)[0];
const ORNEK6 = cocukBulmacalari(6, 1, 2026)[0];

export default async function Yazdirilabilir() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif="yazdirilabilir" />
      <main className="sayfa iki-sutun" style={{ gap: 28 }}>
        <div className="ana-sutun">
          <header>
            <h1 style={{ margin: '6px 0 10px', fontSize: 34, lineHeight: 1.15, fontWeight: 900, color: 'var(--lacivert)' }}>Çocuklar için yazdırılabilir sudoku</h1>
            <p style={{ margin: 0, fontSize: 17, color: '#3B4A60', maxWidth: 640 }}>Boyutu ve sayfa sayısını seç, PDF&apos;i indir ve yazdır. Ücretsiz, üyelik gerekmez. Her bulmacanın tek çözümü var ve tahmin gerektirmeden mantıkla çözülebiliyor.</p>
          </header>
          <section className="kart"><YazdirFormu /></section>
          <section className="kart">
            <h2>Anne babalar ve öğretmenler için</h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15.5, lineHeight: 1.6 }}>
              <li>İlk bulmacada kuralı birlikte söyleyin: &quot;Her satırda, her sütunda ve her kalın kutuda her rakam bir kez.&quot;</li>
              <li>Takıldığında hangi rakamın eksik olduğunu sormak, cevabı söylemekten daha öğreticidir.</li>
              <li>Kurşun kalem ve silgi kullanmak hatadan korkmayı azaltır.</li>
              <li>4×4 kolay gelmeye başlayınca 6×6&apos;ya geçin. Sitede <Link href="/oyna/mini4">Mini 4×4</Link> ve <Link href="/oyna/mini6">Mini 6×6</Link> seviyelerini ekranda da oynayabilirsiniz.</li>
            </ul>
          </section>
        </div>
        <aside className="yan-sutun">
          <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <h2 style={{ alignSelf: 'flex-start' }}>Örnek</h2>
            <MiniIzgara bulmaca={ORNEK4.bulmaca} boyut={170} />
            <span style={{ fontSize: 13, color: 'var(--soluk)' }}>4×4 Mini</span>
            <MiniIzgara bulmaca={ORNEK6.bulmaca} boyut={200} />
            <span style={{ fontSize: 13, color: 'var(--soluk)' }}>6×6 Mini</span>
          </section>
        </aside>
      </main>
    </>
  );
}
