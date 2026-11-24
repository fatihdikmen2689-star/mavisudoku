'use client';
import { useState } from 'react';

export function CikisButonu() {
  const [bekle, setBekle] = useState(false);
  return (
    <button type="button" className="btn-cizgi" disabled={bekle} onClick={async () => {
      setBekle(true);
      await fetch('/api/cikis', { method: 'POST' }).catch(() => null);
      window.location.href = '/';
    }}>Çıkış</button>
  );
}
