'use client';
import { useRef, useState } from 'react';

const SECENEK = {
  4: { ad: '4×4 Mini', yas: 'Yaklaşık 5–7 yaş', aciklama: '1–4 rakamları, sayfada 6 bulmaca', basina: 6 },
  6: { ad: '6×6 Mini', yas: 'Yaklaşık 7–10 yaş', aciklama: '1–6 rakamları, sayfada 4 bulmaca', basina: 4 },
} as const;

export function YazdirFormu() {
  const [boyut, setBoyut] = useState<4 | 6>(4);
  const [sayfa, setSayfa] = useState(2);
  const [indirildi, setIndirildi] = useState(false);
  const tohum = useRef<HTMLInputElement>(null);
  return (
    <form className="form" action="/api/yazdir" method="get" onSubmit={() => {
      // Her indirmede yeni bulmacalar; tohum adreste olduğu için aynı dosya tekrar indirilebilir
      if (tohum.current) tohum.current.value = String(Math.floor(Math.random() * 2 ** 31));
      setIndirildi(true);
    }}>
      <input ref={tohum} type="hidden" name="tohum" defaultValue="" />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 800, marginBottom: 8, color: 'var(--lacivert)' }}>Bulmaca boyutu</legend>
        <div className="secim-izgara">
          {([4, 6] as const).map((b) => (
            <label key={b} className="secim">
              <input type="radio" name="boyut" value={b} checked={boyut === b} onChange={() => setBoyut(b)} />
              <b>{SECENEK[b].ad}</b>
              <span>{SECENEK[b].yas}</span>
              <span>{SECENEK[b].aciklama}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="alan" style={{ maxWidth: 320 }}>
        <label htmlFor="y-sayfa">Kaç sayfa?</label>
        <select id="y-sayfa" name="sayfa" value={sayfa} onChange={(e) => setSayfa(Number(e.target.value))}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} sayfa · {n * SECENEK[boyut].basina} bulmaca</option>)}
        </select>
        <p className="ipucu">Cevap anahtarı PDF&apos;in son sayfasında. Bulmacalar kolaydan zora sıralı.</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button type="submit" className="ana-btn">PDF&apos;i indir</button>
        {indirildi && <span role="status" style={{ fontSize: 14, color: 'var(--yesil)', fontWeight: 700 }}>İndirme başladı. Her indirmede yeni bulmacalar gelir.</span>}
      </div>
    </form>
  );
}
