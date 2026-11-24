'use client';
/** Üyeye gelen maç davetini sitenin her sayfasında küçük bir bildirimle gösterir */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { DavetSatiri } from '../sunucu/mac.ts';
import { SEVIYE_UI } from '../lib/bicim.ts';

export function DavetBildirimi() {
  const [davet, setDavet] = useState<DavetSatiri | null>(null);
  const [gizlenen, setGizlenen] = useState<number[]>([]);
  const [bekle, setBekle] = useState(false);
  const yol = usePathname();
  const router = useRouter();
  const kapali = yol.startsWith('/arkadas') || yol.startsWith('/mac/');

  useEffect(() => {
    if (kapali) return;
    let iptal = false;
    let t: ReturnType<typeof setTimeout>;
    const sor = async () => {
      try {
        const r = await fetch('/api/mac', { cache: 'no-store' });
        if (r.status === 401) return; // üye değil: sormayı bırak
        if (r.ok) {
          const v = await r.json();
          if (!iptal) setDavet((v.gelen as DavetSatiri[]).find((d) => !gizlenen.includes(d.macId)) ?? null);
        }
      } catch { /* sessiz */ }
      if (!iptal) t = setTimeout(sor, 15000);
    };
    void sor();
    return () => { iptal = true; clearTimeout(t); };
  }, [kapali, gizlenen]);

  if (!davet || kapali) return null;
  const yanitla = async (kabul: boolean) => {
    setBekle(true);
    try {
      const r = await fetch(`/api/mac/${davet.macId}/yanit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kabul }) });
      if (r.ok && kabul) router.push(`/mac/${davet.macId}`);
    } finally {
      setGizlenen((g) => [...g, davet.macId]);
      setDavet(null);
      setBekle(false);
    }
  };
  return (
    <div className="davet-bildirim" role="alertdialog" aria-labelledby="davet-baslik">
      <p id="davet-baslik"><strong>{davet.rumuz}</strong> seni {SEVIYE_UI[davet.seviye].ad} maçına davet etti.</p>
      <div>
        <button type="button" className="btn-mavi" disabled={bekle} onClick={() => void yanitla(true)}>Kabul et</button>
        <button type="button" className="btn-cizgi" disabled={bekle} onClick={() => void yanitla(false)}>Reddet</button>
        <button type="button" className="kapat" aria-label="Sonra" onClick={() => { setGizlenen((g) => [...g, davet.macId]); setDavet(null); }}>×</button>
      </div>
    </div>
  );
}
