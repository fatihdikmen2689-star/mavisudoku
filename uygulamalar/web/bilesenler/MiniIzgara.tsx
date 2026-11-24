/** Bulmacanın küçük önizleme resmi (verilen rakamlarla) */
export function MiniIzgara({ bulmaca, boyut = 180, koyu = false }: { bulmaca: string; boyut?: number; koyu?: boolean }) {
  const n = Math.round(Math.sqrt(bulmaca.length));
  const kH = n === 9 ? 3 : 2, kW = n === 4 ? 2 : 3;
  const h = 180 / n;
  const ince = koyu ? '#2A4C7A' : '#C9D6E8', kalin = koyu ? '#7FB2FF' : '#0B2545', yazi = koyu ? '#FFFFFF' : '#0B2545';
  const cizgiler: string[] = [], kalinlar: string[] = [];
  for (let i = 1; i < n; i++) {
    const p = (i * h).toFixed(2);
    (i % kW === 0 ? kalinlar : cizgiler).push(`M${p} 0V180`);
    (i % kH === 0 ? kalinlar : cizgiler).push(`M0 ${p}H180`);
  }
  return (
    <svg viewBox="0 0 180 180" width={boyut} height={boyut} role="img" aria-label="Bulmaca önizlemesi" style={{ maxWidth: '100%', height: 'auto' }}>
      <rect x="1.5" y="1.5" width="177" height="177" rx="8" fill={koyu ? '#16365F' : '#fff'} stroke={kalin} strokeWidth="3" />
      <path d={cizgiler.join('')} stroke={ince} />
      <path d={kalinlar.join('')} stroke={kalin} strokeWidth="2.5" />
      {[...bulmaca].map((c, i) => c === '0' ? null : (
        <text key={i} x={(i % n) * h + h / 2} y={Math.floor(i / n) * h + h / 2 + h * 0.18} textAnchor="middle" fontSize={h * 0.6} fontWeight="900" fill={yazi}>{c}</text>
      ))}
    </svg>
  );
}
