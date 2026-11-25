import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Duzen } from '@mavisudoku/motor';
import { R, Y } from '../lib/tema.ts';

export interface TahtaProps {
  d: Duzen; boyut: number; bulmaca: number[]; girilen: number[]; notlar: number[]; cozum: number[];
  secili: number; hataGoster: boolean; ayniVurgula: boolean; kapali?: boolean; onSec: (i: number) => void;
}

/** Sudoku tahtası: kalın çizgiler kutuları ayırır, seçili hücrenin satır/sütun/kutusu vurgulanır */
export const Tahta = memo(function Tahta({ d, boyut, bulmaca, girilen, notlar, cozum, secili, hataGoster, ayniVurgula, kapali, onSec }: TahtaProps) {
  const n = d.n;
  const h = (boyut - 6) / n;
  const sDeger = secili >= 0 ? bulmaca[secili] || girilen[secili] : 0;
  const yazi = h * (n === 9 ? 0.55 : 0.5);
  return (
    <View style={[s.tahta, { width: boyut, height: boyut }]} accessibilityLabel="Sudoku tahtası">
      {Array.from({ length: n * n }, (_, i) => {
        const r = d.satirOf[i], c = d.sutunOf[i];
        const v = bulmaca[i] || girilen[i];
        const verilen = !!bulmaca[i];
        const yanlis = !verilen && !!v && v !== cozum[i] && hataGoster;
        const bolge = secili >= 0 && i !== secili && (r === d.satirOf[secili] || c === d.sutunOf[secili] || d.kutuOf[i] === d.kutuOf[secili]);
        const ayni = ayniVurgula && !!sDeger && i !== secili && v === sDeger;
        const zemin = i === secili ? R.secili : yanlis ? '#FDECEA' : ayni ? R.ayni : bolge ? R.bolge : '#fff';
        return (
          <Pressable key={i} onPress={() => onSec(i)} accessibilityRole="button"
            accessibilityLabel={`Satır ${r + 1}, sütun ${c + 1}, ${kapali ? 'gizli' : v || (notlar[i] ? 'notlu' : 'boş')}${verilen ? ', verilen' : ''}${yanlis ? ', hatalı' : ''}`}
            style={{
              position: 'absolute', left: 3 + c * h, top: 3 + r * h, width: h, height: h, backgroundColor: zemin,
              borderRightWidth: c === n - 1 ? 0 : (c + 1) % d.kutuSutun === 0 ? 2 : StyleSheet.hairlineWidth * 2,
              borderBottomWidth: r === n - 1 ? 0 : (r + 1) % d.kutuSatir === 0 ? 2 : StyleSheet.hairlineWidth * 2,
              borderRightColor: (c + 1) % d.kutuSutun === 0 ? R.lacivert : R.cizgi2,
              borderBottomColor: (r + 1) % d.kutuSatir === 0 ? R.lacivert : R.cizgi2,
              alignItems: 'center', justifyContent: 'center',
            }}>
            {kapali ? null : v ? (
              <Text style={{ fontSize: yazi, fontFamily: verilen ? Y.yari : Y.orta, color: yanlis ? R.kirmizi : verilen ? R.lacivert : R.mavi }}>{v}</Text>
            ) : notlar[i] ? (
              <View style={{ width: h - 4, height: h - 4, flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: n }, (_, k) => (
                  <Text key={k} style={{ width: (h - 4) / d.kutuSutun, height: (h - 4) / d.kutuSatir, textAlign: 'center', fontSize: h / (n === 9 ? 4.2 : 3.6), lineHeight: (h - 4) / d.kutuSatir, color: R.soluk, fontFamily: Y.orta }}>
                    {notlar[i] & (1 << k) ? k + 1 : ''}
                  </Text>
                ))}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
});

const s = StyleSheet.create({
  tahta: { backgroundColor: R.lacivert, borderRadius: 10, position: 'relative', overflow: 'hidden' },
});
