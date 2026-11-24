'use client';
/** Maç ekranının sunucuyla bağlantısı: durum sorgulama (2 sn), geri sayım ve ilerleme bildirimi */
import { useEffect, useRef, useState } from 'react';
import type { MacDurumu } from '../sunucu/mac.ts';

export interface MacBaglantisi {
  durum: MacDurumu | null;
  /** Maçın başladığı an (tarayıcı saatine çevrilmiş, ms) */
  baslangicYerel: number | null;
  kalanSaniye: number;
  basladi: boolean;
  hata: string | null;
}

export function useMac(macId: number | undefined, dogru: number, hata: number): MacBaglantisi {
  const [durum, setDurum] = useState<MacDurumu | null>(null);
  const [baslangicYerel, setBaslangicYerel] = useState<number | null>(null);
  const [simdi, setSimdi] = useState(() => Date.now());
  const [baglantiHatasi, setBaglantiHatasi] = useState<string | null>(null);

  useEffect(() => {
    if (!macId) return;
    let iptal = false;
    let zamanlayici: ReturnType<typeof setTimeout>;
    const sor = async () => {
      try {
        const r = await fetch(`/api/mac/${macId}`, { cache: 'no-store' });
        const v = await r.json();
        if (iptal) return;
        if (!r.ok) { setBaglantiHatasi(v.hata ?? 'Maç bilgisi alınamadı.'); }
        else {
          setBaglantiHatasi(null);
          setDurum(v);
          if (v.baslamayaKalanMs !== null) setBaslangicYerel(Date.now() + v.baslamayaKalanMs);
          if (v.bitti) return; // maç bitti, sormayı bırak
        }
      } catch {
        if (!iptal) setBaglantiHatasi('Bağlantı koptu, yeniden deneniyor…');
      }
      if (!iptal) zamanlayici = setTimeout(sor, document.hidden ? 5000 : 2000);
    };
    void sor();
    return () => { iptal = true; clearTimeout(zamanlayici); };
  }, [macId]);

  // Geri sayım için saat
  useEffect(() => {
    if (!macId) return;
    const t = setInterval(() => setSimdi(Date.now()), 250);
    return () => clearInterval(t);
  }, [macId]);

  // İlerlemeyi bildir (değişince, en fazla saniyede bir)
  const son = useRef('');
  useEffect(() => {
    if (!macId || !durum || durum.durum !== 'basladi' || durum.bitti) return;
    const anahtar = `${dogru}/${hata}`;
    if (anahtar === son.current) return;
    const t = setTimeout(() => {
      son.current = anahtar;
      void fetch(`/api/mac/${macId}/ilerleme`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dogru, hata }) }).catch(() => { son.current = ''; });
    }, 700);
    return () => clearTimeout(t);
  }, [macId, durum, dogru, hata]);

  const kalanMs = baslangicYerel === null ? Infinity : baslangicYerel - simdi;
  return { durum, baslangicYerel, kalanSaniye: Math.max(0, Math.ceil(kalanMs / 1000)), basladi: kalanMs <= 0, hata: baglantiHatasi };
}
