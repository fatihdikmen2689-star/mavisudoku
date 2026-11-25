import { View, Text } from 'react-native';
import { duzen } from '@mavisudoku/motor';
import { Y } from '../lib/tema.ts';

/** Kartlardaki küçük bulmaca önizlemesi */
export function MiniIzgara({ bulmaca, boyut, koyu = false }: { bulmaca: string; boyut: number; koyu?: boolean }) {
  const n = Math.round(Math.sqrt(bulmaca.length)) as 4 | 6 | 9;
  const d = duzen(n);
  const h = boyut / n;
  const ince = koyu ? '#2D4E7C' : '#D5E0EE', kalin = koyu ? '#7FB2FF' : '#0B2545';
  return (
    <View style={{ width: boyut, height: boyut, borderWidth: 2, borderColor: kalin, borderRadius: 6, backgroundColor: koyu ? '#123056' : '#fff', overflow: 'hidden' }}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[...bulmaca].map((c, i) => {
        const r = d.satirOf[i], s = d.sutunOf[i];
        return (
          <View key={i} style={{
            position: 'absolute', left: s * h - 2 * (s / n), top: r * h - 2 * (r / n), width: h, height: h, alignItems: 'center', justifyContent: 'center',
            borderRightWidth: s === n - 1 ? 0 : (s + 1) % d.kutuSutun === 0 ? 1.5 : 0.5, borderBottomWidth: r === n - 1 ? 0 : (r + 1) % d.kutuSatir === 0 ? 1.5 : 0.5,
            borderRightColor: (s + 1) % d.kutuSutun === 0 ? kalin : ince, borderBottomColor: (r + 1) % d.kutuSatir === 0 ? kalin : ince,
          }}>
            {c !== '0' && <Text style={{ fontSize: h * 0.55, fontFamily: Y.yari, color: koyu ? '#fff' : '#0B2545' }}>{c}</Text>}
          </View>
        );
      })}
    </View>
  );
}
