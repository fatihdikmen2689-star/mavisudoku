import type { Sekil } from '../lib/sekiller.ts';

const R = { bolge: '#D4E4FF', anahtar: '#FFE7CC', cevap: '#DDF5E6' };

/** Taktik yazılarındaki açıklamalı 9×9 ızgara */
export function TaktikIzgara({ sekil, etiket }: { sekil: Sekil; etiket?: string }) {
  const H = 40, N = 9, W = H * N;
  const bolge = new Set(sekil.bolge ?? []), anahtar = new Set(sekil.anahtar ?? []);
  const hucreler = [];
  for (let i = 0; i < 81; i++) {
    const x = (i % 9) * H, y = Math.floor(i / 9) * H;
    const fon = sekil.cevap?.[i] ? R.cevap : anahtar.has(i) ? R.anahtar : bolge.has(i) ? R.bolge : null;
    if (fon) hucreler.push(<rect key={`f${i}`} x={x} y={y} width={H} height={H} fill={fon} />);
    const v = sekil.rakamlar[i] ?? sekil.cevap?.[i];
    if (v) {
      hucreler.push(<text key={`r${i}`} x={x + H / 2} y={y + H * 0.7} textAnchor="middle" fontSize={H * 0.58} fontWeight={900} fill={sekil.cevap?.[i] ? '#13804A' : anahtar.has(i) ? '#A04E00' : '#0B2545'}>{v}</text>);
    } else if (sekil.adaylar?.[i]) {
      for (const d of sekil.adaylar[i]) {
        // Tek adaylı hücrede (tek rakam görünümü) aday ortada ve büyük çizilir
        const tek = sekil.adaylar[i].length === 1;
        const cx = tek ? x + H / 2 : x + ((d - 1) % 3) * (H / 3) + H / 6, cy = tek ? y + H / 2 : y + Math.floor((d - 1) / 3) * (H / 3) + H / 6;
        const sil = sekil.silinen?.[i]?.includes(d);
        hucreler.push(<text key={`a${i}-${d}`} x={cx} y={cy + (tek ? 6 : 4)} textAnchor="middle" fontSize={tek ? 17 : 11.5} fontWeight={800} fill={sil ? '#D6332B' : anahtar.has(i) ? '#A04E00' : '#3B5A85'}>{d}</text>);
        if (sil) hucreler.push(<path key={`s${i}-${d}`} d={tek ? `M${cx - 9} ${cy + 9}L${cx + 9} ${cy - 9}` : `M${cx - 6} ${cy + 6}L${cx + 6} ${cy - 6}`} stroke="#D6332B" strokeWidth={2} />);
      }
    }
  }
  const cizgi = [];
  for (let k = 1; k < N; k++) {
    const kalin = k % 3 === 0;
    cizgi.push(<path key={`v${k}`} d={`M${k * H} 0V${W}`} stroke={kalin ? '#0B2545' : '#C9D6E8'} strokeWidth={kalin ? 2.5 : 1} />);
    cizgi.push(<path key={`h${k}`} d={`M0 ${k * H}H${W}`} stroke={kalin ? '#0B2545' : '#C9D6E8'} strokeWidth={kalin ? 2.5 : 1} />);
  }
  return (
    <figure className="sekil">
      <svg viewBox={`-2 -2 ${W + 4} ${W + 4}`} role="img" aria-label={etiket ?? sekil.aciklama}>
        <rect x={0} y={0} width={W} height={W} fill="#fff" />
        {hucreler}
        {cizgi}
        <rect x={0} y={0} width={W} height={W} fill="none" stroke="#0B2545" strokeWidth={3} rx={4} />
      </svg>
      <figcaption>{sekil.aciklama}</figcaption>
    </figure>
  );
}
