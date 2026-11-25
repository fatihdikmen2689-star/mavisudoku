/** Uygulama genelinde kullanılan küçük parçalar: düğmeler, kart, başlık, yazılar */
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { R, Y } from '../lib/tema.ts';

export function Yazi({ style, ...p }: React.ComponentProps<typeof Text>) {
  return <Text {...p} style={[{ fontFamily: Y.normal, color: R.yazi, fontSize: 15 }, style]} />;
}

export function Dugme({ metin, onPress, tur = 'ana', devre, yukleniyor, style, kucuk }: {
  metin: string; onPress: () => void; tur?: 'ana' | 'mavi' | 'ikincil' | 'tehlike' | 'koyu';
  devre?: boolean; yukleniyor?: boolean; style?: StyleProp<ViewStyle>; kucuk?: boolean;
}) {
  const r = { ana: [R.turuncu, R.turuncuYazi], mavi: [R.maviAcik, '#fff'], ikincil: [R.acik, R.mavi], tehlike: [R.kirmizi, '#fff'], koyu: [R.lacivert2, '#fff'] }[tur];
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!devre }} disabled={devre || yukleniyor} onPress={onPress}
      style={({ pressed }) => [s.dugme, kucuk && s.kucuk, { backgroundColor: r[0], opacity: devre ? 0.5 : pressed ? 0.85 : 1 }, tur === 'ana' && s.golge, style]}>
      {yukleniyor ? <ActivityIndicator color={r[1]} /> : <Text style={[s.dugmeYazi, kucuk && { fontSize: 14 }, { color: r[1] }]}>{metin}</Text>}
    </Pressable>
  );
}

export function Kart({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.kart, style]}>{children}</View>;
}

export function Baslik({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text accessibilityRole="header" style={[s.baslik, style]}>{children}</Text>;
}

export function Uyari({ metin, tur = 'hata' }: { metin: string; tur?: 'hata' | 'bilgi' | 'iyi' }) {
  const r = { hata: ['#FDECEA', '#8A1C13'], bilgi: [R.acik, R.lacivert], iyi: ['#E5F5EC', R.yesil] }[tur];
  return <View accessibilityRole="alert" style={[s.uyari, { backgroundColor: r[0] }]}><Text style={{ fontFamily: Y.orta, color: r[1], fontSize: 14, lineHeight: 20 }}>{metin}</Text></View>;
}

export function Yukleniyor({ metin = 'Yükleniyor…' }: { metin?: string }) {
  return <View style={{ padding: 32, alignItems: 'center', gap: 10 }}><ActivityIndicator color={R.mavi} /><Yazi style={{ color: R.soluk }}>{metin}</Yazi></View>;
}

const s = StyleSheet.create({
  dugme: { minHeight: 50, borderRadius: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  kucuk: { minHeight: 40, borderRadius: 10, paddingHorizontal: 14 },
  golge: { borderBottomWidth: 4, borderBottomColor: R.turuncuGolge },
  dugmeYazi: { fontFamily: Y.yari, fontSize: 16 },
  kart: { backgroundColor: R.kart, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: R.cizgi, gap: 10 },
  baslik: { fontFamily: Y.kalin, fontSize: 19, color: R.lacivert },
  uyari: { borderRadius: 12, padding: 12 },
});
