'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { reklamOnayiniUygula } from '../lib/reklam.ts';

/**
 * Çerez onay bandı. Seçim tarayıcıda saklanır ve "ms_cerez" çerezine de yazılır
 * (reklamlar bu değere göre istenir: seçim yapılana kadar hiç, "gerekli"de kişiselleştirilmemiş; bkz. lib/reklam.ts).
 * "Yalnızca gerekli" ile "Tümünü kabul et" eşit görünürlükte.
 */
export function CerezBandi() {
  const [goster, setGoster] = useState(false);
  useEffect(() => {
    setGoster(!document.cookie.split('; ').some((c) => c.startsWith('ms_cerez=')));
    const ac = () => setGoster(true);
    window.addEventListener('ms-cerez-tercih', ac);
    return () => window.removeEventListener('ms-cerez-tercih', ac);
  }, []);
  const sec = (deger: 'gerekli' | 'tumu') => {
    document.cookie = `ms_cerez=${deger}; path=/; max-age=${180 * 86400}; samesite=lax`;
    reklamOnayiniUygula(deger);
    setGoster(false);
  };
  if (!goster) return null;
  return (
    <div className="cerez" role="dialog" aria-labelledby="cerez-baslik">
      <div className="cerez-ic">
        <p><strong id="cerez-baslik">Çerezleri nasıl kullanalım?</strong>Oyununu kaydetmek için gerekli çerezleri her zaman kullanırız. Reklamları kişiselleştirmek ve siteyi ölçmek için iznini isteriz. <Link href="/cerezler" style={{ color: '#9CC1F5', fontWeight: 600 }}>Çerez politikası</Link></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={() => sec('gerekli')}>Yalnızca gerekli</button>
          <button type="button" onClick={() => sec('tumu')}>Tümünü kabul et</button>
        </div>
      </div>
    </div>
  );
}
