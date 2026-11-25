/** Profil: istatistikler, son çözülenler, reklam tercihleri, çıkış ve hesabı silme (uygulama mağazası şartı) */
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SEVIYE_SIRASI } from '@mavisudoku/motor';
import { api, ApiHatasi } from '../lib/api.ts';
import { useOturum } from '../lib/oturum.tsx';
import { sureMetni, sayi, SEVIYE_UI } from '../lib/bicim.ts';
import { R, Y } from '../lib/tema.ts';
import type { Profil } from '../lib/tipler.ts';
import { Baslik, Dugme, Kart, Uyari, Yazi, Yukleniyor } from '../bilesenler/ortak.tsx';
import { Alan } from '../bilesenler/Form.tsx';
import { gizlilikTercihleriniAc } from '../reklam/Baslatici';

export default function ProfilEkrani() {
  const { oyuncu, cikis, hesapSilindi } = useOturum();
  const [p, setP] = useState<Profil | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [silAcik, setSilAcik] = useState(false);
  const [sifre, setSifre] = useState('');
  const [onay, setOnay] = useState('');
  const [silHata, setSilHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);

  useFocusEffect(useCallback(() => {
    if (oyuncu?.tip !== 'uye') { router.replace('/giris'); return; }
    api<Profil>('/api/profil').then((v) => { setP(v); setHata(null); }).catch((e) => setHata(e instanceof ApiHatasi ? e.message : 'Yüklenemedi.'));
  }, [oyuncu]));

  if (hata) return <View style={{ padding: 16 }}><Uyari metin={hata} /></View>;
  if (!p) return <Yukleniyor />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={s.avatar}><Text style={{ color: '#fff', fontFamily: Y.kalin, fontSize: 24 }}>{p.rumuz.charAt(0).toLocaleUpperCase('tr')}</Text></View>
        <View><Text style={{ fontFamily: Y.kalin, fontSize: 22, color: R.lacivert }}>{p.rumuz}</Text><Yazi style={{ color: R.soluk, fontSize: 13 }}>{p.ad} {p.soyad}</Yazi></View>
      </View>
      <Kart>
        <View style={s.ist}>
          {[['Çözülen', sayi(p.cozulen)], ['Puan', sayi(p.toplamPuan)], ['Seri', `${p.seri} gün`], ['Maç', `${p.maclar.kazanilan}G ${p.maclar.kaybedilen}M`]].map(([a, b]) => (
            <View key={a} style={{ flexBasis: '45%', flexGrow: 1 }}><Text style={s.istBaslik}>{a}</Text><Text style={s.istDeger}>{b}</Text></View>
          ))}
        </View>
      </Kart>
      <Kart>
        <Baslik>Seviyeler</Baslik>
        {SEVIYE_SIRASI.map((sv) => {
          const v = p.seviyeler.find((x) => x.seviye === sv);
          return (
            <View key={sv} style={s.satir}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: SEVIYE_UI[sv].renk }} />
              <Text style={{ flex: 1, fontFamily: Y.yari, color: R.lacivert }}>{SEVIYE_UI[sv].ad}</Text>
              <Text style={s.ek}>{v ? `${v.cozulen} · en iyi ${sureMetni(v.enIyi)}` : '—'}</Text>
            </View>
          );
        })}
      </Kart>
      {p.sonOyunlar.length > 0 && (
        <Kart>
          <Baslik>Son çözdüklerin</Baslik>
          {p.sonOyunlar.map((o) => (
            <Pressable key={o.bulmacaId} accessibilityRole="button" onPress={() => router.push(`/bulmaca/${o.bulmacaId}`)} style={s.satir}>
              <Text style={{ flex: 1, fontFamily: Y.yari, color: R.lacivert }}>#{o.bulmacaId} · {SEVIYE_UI[o.seviye].ad}</Text>
              <Text style={s.ek}>{sureMetni(o.sure)} · +{sayi(o.puan)}</Text>
            </Pressable>
          ))}
        </Kart>
      )}
      <Kart>
        <Baslik>Hesap</Baslik>
        <Yazi style={{ color: R.soluk, fontSize: 13 }}>Ad soyad, sıralamada görünüm ve şifre ayarlarını web sitesinden değiştirebilirsin.</Yazi>
        <Dugme tur="ikincil" kucuk metin="Hesap ayarlarını aç (mavisudoku.com)" onPress={() => void Linking.openURL('https://mavisudoku.com/profil')} />
        <Dugme tur="ikincil" kucuk metin="Reklam ve gizlilik tercihleri" onPress={() => void gizlilikTercihleriniAc()} />
        <Dugme tur="koyu" kucuk metin="Çıkış yap" onPress={async () => { await cikis(); router.replace('/'); }} />
      </Kart>
      <Kart>
        <Baslik>Hesabı sil</Baslik>
        {!silAcik ? (
          <Dugme tur="ikincil" kucuk metin="Hesabımı sil" onPress={() => setSilAcik(true)} />
        ) : (
          <View style={{ gap: 10 }}>
            <Uyari metin="Hesabın, çözdüğün bulmacalar, sıralamadaki yerlerin, yorumların ve maçların kalıcı olarak silinir. Bu işlem geri alınamaz." />
            <Alan etiket="Şifren" value={sifre} onChangeText={(t) => { setSifre(t); setSilHata(null); }} secureTextEntry />
            <Alan etiket="Onaylamak için SİL yaz" value={onay} onChangeText={(t) => { setOnay(t); setSilHata(null); }} autoCapitalize="characters" />
            {silHata && <Uyari metin={silHata} />}
            <Dugme tur="tehlike" metin="Hesabımı kalıcı olarak sil" yukleniyor={bekle} devre={!sifre || !onay} onPress={async () => {
              setBekle(true);
              try { await api('/api/hesap/sil', { govde: { sifre, onay } }); await hesapSilindi(); router.replace('/'); }
              catch (e) { setSilHata(e instanceof ApiHatasi ? e.message : 'Silinemedi.'); }
              finally { setBekle(false); }
            }} />
            <Dugme tur="ikincil" kucuk metin="Vazgeç" onPress={() => { setSilAcik(false); setSifre(''); setOnay(''); }} />
          </View>
        )}
      </Kart>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: R.maviAcik, alignItems: 'center', justifyContent: 'center' },
  ist: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  istBaslik: { fontFamily: Y.orta, fontSize: 12, color: R.soluk },
  istDeger: { fontFamily: Y.kalin, fontSize: 20, color: R.lacivert },
  satir: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  ek: { fontFamily: Y.normal, fontSize: 13, color: R.soluk },
});
