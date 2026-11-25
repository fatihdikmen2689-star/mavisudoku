import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { R, Y } from '../lib/tema.ts';

export function Alan({ etiket, hata, ipucu, ...p }: TextInputProps & { etiket: string; hata?: string | null; ipucu?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.etiket}>{etiket}</Text>
      <TextInput placeholderTextColor="#8494AB" accessibilityLabel={etiket} {...p} style={[s.giris, !!hata && { borderColor: R.kirmizi, borderWidth: 2 }]} />
      {hata ? <Text style={s.hata}>{hata}</Text> : ipucu ? <Text style={s.ipucu}>{ipucu}</Text> : null}
    </View>
  );
}

export function Onay({ secili, onDegis, children, devre, radyo }: { secili: boolean; onDegis: (v: boolean) => void; children: React.ReactNode; devre?: boolean; radyo?: boolean }) {
  return (
    <Pressable accessibilityRole={radyo ? 'radio' : 'checkbox'} accessibilityState={{ checked: secili, disabled: !!devre }} disabled={devre}
      onPress={() => onDegis(!secili)} style={[s.onay, devre && { opacity: 0.45 }]}>
      <View style={[s.kutu, radyo && { borderRadius: 11 }, secili && { backgroundColor: R.maviAcik, borderColor: R.maviAcik }]}>
        {secili && <Text style={{ color: '#fff', fontFamily: Y.kalin, fontSize: 13 }}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text style={s.onayYazi}>{children}</Text> : children}</View>
    </Pressable>
  );
}

export const formStil = StyleSheet.create({ onayYazi: { fontFamily: 'Inter_400Regular', fontSize: 14, color: R.yazi, lineHeight: 20 } });

const s = StyleSheet.create({
  etiket: { fontFamily: Y.yari, fontSize: 14, color: R.lacivert },
  giris: { minHeight: 50, borderWidth: 1, borderColor: R.cizgi2, borderRadius: 12, paddingHorizontal: 14, fontFamily: Y.normal, fontSize: 16, color: R.yazi, backgroundColor: '#fff' },
  hata: { fontFamily: Y.orta, fontSize: 13, color: R.kirmizi },
  ipucu: { fontFamily: Y.normal, fontSize: 12.5, color: R.soluk },
  onay: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 },
  kutu: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: R.cizgi2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  onayYazi: { fontFamily: Y.normal, fontSize: 14, color: R.yazi, lineHeight: 20 },
});
