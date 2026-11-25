/** Genel sıralama: bugün, bu hafta, tüm zamanlar */
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, ApiHatasi } from '../lib/api.ts';
import { sayi } from '../lib/bicim.ts';
import { R, Y } from '../lib/tema.ts';
import type { GenelSatir } from '../lib/tipler.ts';
import { Uyari, Yazi, Yukleniyor } from '../bilesenler/ortak.tsx';
import { Banner } from '../reklam/Banner';

type Donem = 'gun' | 'hafta' | 'tum';
const SEKME: Record<Donem, string> = { gun: 'Bugün', hafta: 'Bu hafta', tum: 'Tüm zamanlar' };

export default function Siralama() {
  const [donem, setDonem] = useState<Donem>('hafta');
  const [liste, setListe] = useState<GenelSatir[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    setListe(null);
    api<{ liste: GenelSatir[] }>(`/api/siralama?donem=${donem}`).then((v) => { setListe(v.liste); setHata(null); })
      .catch((e) => setHata(e instanceof ApiHatasi ? e.message : 'Yüklenemedi.'));
  }, [donem]));
  return (
    <View style={{ flex: 1 }}>
      <View style={s.sekmeler} accessibilityRole="tablist">
        {(Object.keys(SEKME) as Donem[]).map((k) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: k === donem }} onPress={() => setDonem(k)} style={[s.sekme, k === donem && s.secili]}>
            <Text style={[s.sekmeYazi, k === donem && { color: R.lacivert }]}>{SEKME[k]}</Text>
          </Pressable>
        ))}
      </View>
      {hata ? <View style={{ padding: 16 }}><Uyari metin={hata} /></View> : !liste ? <Yukleniyor /> : (
        <FlatList data={liste} keyExtractor={(x) => String(x.sira)} contentContainerStyle={{ padding: 16, gap: 6 }}
          ListEmptyComponent={<Yazi style={{ color: R.soluk, textAlign: 'center', marginTop: 24 }}>Bu dönemde henüz kimse puan almadı.</Yazi>}
          ListFooterComponent={<Yazi style={{ color: R.soluk, fontSize: 12, marginTop: 10 }}>Sıralamaya giren her çözümün puanı toplanır. Günler ve haftalar Türkiye saatine göredir.</Yazi>}
          renderItem={({ item: x }) => (
            <View style={[s.satir, x.benim && { backgroundColor: R.acik, borderColor: R.maviAcik }]}>
              <Text style={[s.sira, x.sira <= 3 && { color: '#8A4300' }]}>{x.sira}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.ad} numberOfLines={1}>{x.ad}{x.benim ? '  (sen)' : ''}</Text>
                <Text style={s.ek}>{x.misafir ? 'misafir · ' : ''}{x.yas ? `${x.yas} yaş · ` : ''}{sayi(x.cozulen)} çözüm</Text>
              </View>
              <Text style={s.puan}>{sayi(x.puan)}</Text>
            </View>
          )} />
      )}
      <Banner />
    </View>
  );
}

const s = StyleSheet.create({
  sekmeler: { flexDirection: 'row', margin: 16, marginBottom: 0, padding: 5, gap: 5, borderRadius: 14, backgroundColor: '#E4EBF5' },
  sekme: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secili: { backgroundColor: '#fff' },
  sekmeYazi: { fontFamily: Y.yari, color: R.soluk, fontSize: 14 },
  satir: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: R.cizgi, padding: 12 },
  sira: { width: 30, fontFamily: Y.kalin, fontSize: 16, color: R.lacivert },
  ad: { fontFamily: Y.yari, fontSize: 15, color: R.lacivert },
  ek: { fontFamily: Y.normal, fontSize: 12, color: R.soluk },
  puan: { fontFamily: Y.kalin, fontSize: 16, color: R.mavi },
});
