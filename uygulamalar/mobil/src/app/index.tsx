/** Ana ekran: günün sudokusu, kaldığın yerden devam, seviyeler, bugünün en hızlıları */
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SEVIYE_SIRASI } from '@mavisudoku/motor';
import { api, ApiHatasi } from '../lib/api.ts';
import { useOturum } from '../lib/oturum.tsx';
import { sureMetni, sayi, SEVIYE_UI, TARIH_BICIMI } from '../lib/bicim.ts';
import { R, Y } from '../lib/tema.ts';
import type { Ozet } from '../lib/tipler.ts';
import { Baslik, Dugme, Kart, Uyari, Yazi, Yukleniyor } from '../bilesenler/ortak.tsx';
import { MiniIzgara } from '../bilesenler/MiniIzgara.tsx';
import { Banner } from '../reklam/Banner';

export default function AnaEkran() {
  const ust = useSafeAreaInsets().top;
  const { oyuncu, hazir, hata: oturumHatasi, yeniden } = useOturum();
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try { setOzet(await api<Ozet>('/api/ozet')); setHata(null); }
    catch (e) { setHata(e instanceof ApiHatasi ? e.message : 'Yüklenemedi.'); }
  }, []);
  // Ekrana her dönüşte (ör. bulmaca bitince) tazele
  useFocusEffect(useCallback(() => { if (oyuncu) void yukle(); }, [oyuncu, yukle]));

  const sonSeviye = ozet?.yarim?.seviye ?? 'kolay';
  return (
    <View style={{ flex: 1, backgroundColor: R.zemin }}>
      <View style={[s.ust, { paddingTop: ust + 10 }]}>
        <Text style={s.logo}>Mavi<Text style={{ color: '#7FB2FF' }}>Sudoku</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!!ozet?.seri && <View style={s.cip}><Text style={s.cipYazi}>🔥 {ozet.seri} gün</Text></View>}
          <Pressable accessibilityRole="button" onPress={() => router.push(oyuncu?.tip === 'uye' ? '/profil' : '/giris')} style={s.cip}>
            <Text style={s.cipYazi}>{oyuncu?.tip === 'uye' ? oyuncu.ad : 'Giriş yap'}</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={async () => { setYenileniyor(true); await yukle(); setYenileniyor(false); }} />}>
        {(oturumHatasi || hata) && (
          <View style={{ gap: 8 }}>
            <Uyari metin={oturumHatasi ?? hata!} />
            <Dugme tur="ikincil" metin="Tekrar dene" onPress={() => { void (oturumHatasi ? yeniden() : yukle()); }} />
          </View>
        )}
        {!hazir || (!ozet && !hata && !oturumHatasi) ? <Yukleniyor /> : null}
        {ozet && (
          <>
            <Kart>
              <Yazi style={{ color: R.mavi, fontFamily: Y.yari, fontSize: 12, letterSpacing: 0.5 }}>{TARIH_BICIMI.format(new Date()).toLocaleUpperCase('tr')}</Yazi>
              <Text style={s.hero}>Bugünün sudokusu seni bekliyor.</Text>
              <Dugme metin={`▶  Hemen oyna · ${SEVIYE_UI[sonSeviye].ad}`} onPress={() => router.push(`/oyna/${sonSeviye}`)} />
              {ozet.yarim && (
                <Pressable accessibilityRole="button" onPress={() => router.push(`/oyna/${ozet.yarim!.seviye}`)} style={s.devam}>
                  <Text style={{ fontFamily: Y.yari, color: R.lacivert }}>Kaldığın yerden devam et</Text>
                  <Text style={{ fontFamily: Y.normal, color: R.soluk, fontSize: 13 }}>Bulmaca #{ozet.yarim.bulmacaId} · {SEVIYE_UI[ozet.yarim.seviye].ad}</Text>
                </Pressable>
              )}
              {oyuncu?.tip !== 'uye' && <Yazi style={{ color: R.soluk, fontSize: 13 }}>Üye olmadan da oynayabilirsin: {oyuncu?.ad} adıyla sıralamaya girersin.</Yazi>}
            </Kart>

            <Pressable accessibilityRole="button" accessibilityLabel={`Günün sudokusu, ${SEVIYE_UI[ozet.gunluk.seviye].ad}`}
              onPress={() => router.push(`/oyna/${ozet.gunluk.seviye}?bulmaca=${ozet.gunluk.id}`)} style={s.gunluk}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontFamily: Y.kalin, fontSize: 18 }}>Günün Sudokusu</Text>
                <View style={s.rozet}><Text style={{ color: '#fff', fontFamily: Y.yari, fontSize: 12 }}>{SEVIYE_UI[ozet.gunluk.seviye].ad}</Text></View>
              </View>
              <View style={{ alignItems: 'center' }}><MiniIzgara bulmaca={ozet.gunluk.bulmaca} boyut={200} koyu /></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#C9DBF5', fontFamily: Y.normal }}><Text style={{ color: '#fff', fontFamily: Y.kalin }}>{sayi(ozet.gunluk.cozulme)}</Text> kişi çözdü</Text>
                <Text style={{ color: '#C9DBF5', fontFamily: Y.normal }}>Rekor <Text style={{ color: '#fff', fontFamily: Y.kalin }}>{sureMetni(ozet.gunluk.rekor)}</Text></Text>
              </View>
            </Pressable>

            <Baslik>Seviyeni seç</Baslik>
            <View style={s.izgara}>
              {SEVIYE_SIRASI.map((sv) => {
                const o = ozet.seviyeler[sv];
                return (
                  <Pressable key={sv} accessibilityRole="button" onPress={() => router.push(`/oyna/${sv}`)} style={({ pressed }) => [s.seviye, pressed && { opacity: 0.8 }]}>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: SEVIYE_UI[sv].renk }} />
                    <Text style={{ fontFamily: Y.kalin, fontSize: 16, color: R.lacivert }}>{SEVIYE_UI[sv].ad}</Text>
                    <Text style={{ fontFamily: Y.normal, fontSize: 12, color: R.soluk }}>{o ? `${o.cozulen} çözüldü · en iyi ${sureMetni(o.enIyi)}` : 'Henüz çözmedin'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Kart>
              <Baslik>Bugünün en hızlıları</Baslik>
              {ozet.enHizlilar.length === 0
                ? <Yazi style={{ color: R.soluk }}>Bugün henüz kimse çözmedi. İlk sen ol!</Yazi>
                : ozet.enHizlilar.map((x) => (
                  <View key={x.sira} style={[s.satir, x.benim && { backgroundColor: R.acik }]}>
                    <Text style={{ width: 24, fontFamily: Y.kalin, color: x.sira === 1 ? '#8A4300' : R.lacivert }}>{x.sira}</Text>
                    <Text style={{ flex: 1, fontFamily: Y.yari, color: R.lacivert }} numberOfLines={1}>{x.ad}{x.misafir ? '  ·  misafir' : ''}</Text>
                    <Text style={{ fontFamily: Y.yari, color: R.mavi, fontVariant: ['tabular-nums'] }}>{sureMetni(x.sure)}</Text>
                  </View>
                ))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Dugme tur="ikincil" kucuk metin="Günün sıralaması" style={{ flex: 1 }} onPress={() => router.push(`/bulmaca/${ozet.gunluk.id}`)} />
                <Dugme tur="ikincil" kucuk metin="Genel sıralama" style={{ flex: 1 }} onPress={() => router.push('/siralama')} />
              </View>
            </Kart>
            <Pressable accessibilityRole="link" onPress={() => router.push(oyuncu?.tip === 'uye' ? '/profil' : '/kayit')} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ fontFamily: Y.yari, color: R.mavi }}>{oyuncu?.tip === 'uye' ? 'Profilim ve istatistiklerim' : 'Ücretsiz kayıt ol, skorların kaybolmasın'}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <Banner />
    </View>
  );
}

const s = StyleSheet.create({
  ust: { backgroundColor: R.lacivert, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: '#fff', fontFamily: Y.kalin, fontSize: 22 },
  cip: { backgroundColor: R.lacivert2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  cipYazi: { color: '#fff', fontFamily: Y.yari, fontSize: 13 },
  hero: { fontFamily: Y.kalin, fontSize: 26, lineHeight: 31, color: R.lacivert },
  devam: { borderRadius: 14, borderWidth: 1, borderColor: R.cizgi, padding: 12, gap: 2, backgroundColor: R.zemin },
  gunluk: { backgroundColor: R.lacivert, borderRadius: 20, padding: 18, gap: 14 },
  rozet: { backgroundColor: R.mavi, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  seviye: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: R.cizgi, padding: 14, gap: 6 },
  satir: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10 },
});
