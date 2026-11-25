'use client';
import { useEffect, useRef } from 'react';
import { ADSENSE_ISTEMCI, REKLAM_SLOT, type ReklamYeri } from '../lib/reklam.ts';

/**
 * Reklam alanı. Yer ayrılmış kutu sayfa kaymasını önler; "Reklam" etiketi içeriğe karışmasın diye görünür.
 * Çocuklara yönelik sayfalarda (yazdırılabilir) kullanılmaz.
 */
export function Reklam({ yer, uzun = false, style }: { yer: ReklamYeri; uzun?: boolean; style?: React.CSSProperties }) {
  const slot = REKLAM_SLOT[yer];
  const yuklendi = useRef(false);
  useEffect(() => {
    if (!ADSENSE_ISTEMCI || !slot || yuklendi.current) return;
    yuklendi.current = true;
    try {
      const w = window as unknown as { adsbygoogle: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch { /* reklam engelleyici */ }
  }, [slot]);

  if (!ADSENSE_ISTEMCI || !slot) {
    if (process.env.NODE_ENV === 'production') return null;
    return <div className={`reklam${uzun ? ' uzun' : ''}`} role="complementary" aria-label="Reklam alanı" style={style}>Reklam alanı ({yer})</div>;
  }
  return (
    <aside className={`reklam-kutu${uzun ? ' uzun' : ''}`} aria-label="Reklam" style={style}>
      <span className="reklam-etiket">Reklam</span>
      <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={ADSENSE_ISTEMCI} data-ad-slot={slot} data-ad-format={uzun ? 'vertical' : 'auto'} data-full-width-responsive="true" />
    </aside>
  );
}
