/** Bulmacanın sıralaması ve yorumları; bitiren üyeler yorum yazabilir */
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, ApiHatasi } from '../../lib/api.ts';
import { useOturum } from '../../lib/oturum.tsx';
import { sureMetni, sayi, SEVIYE_UI } from '../../lib/bicim.ts';
import { R, Y } from '../../lib/tema.ts';
import type { BulmacaBilgisi, SiralamaSatiri, Yorum } from '../../lib/tipler.ts';
import { Baslik, Dugme, Kart, Uyari, Yazi, Yukleniyor } from '../../bilesenler/ortak.tsx';
import { MiniIzgara } from '../../bilesenler/MiniIzgara.tsx';
import { Banner } from '../../reklam/Banner';

interface Veri { bilgi: BulmacaBilgisi; siralama: SiralamaSatiri[]; yorumlar: Yorum[]; durum: 'yok' | 'yarim' | 'bitti' }

export default function BulmacaEkrani() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { oyuncu } = useOturum();
  const [v, setV] = useState<Veri | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [metin, setMetin] = useState('');
  const [mesaj, setMesaj] = useState<{ tur: 'hata' | 'iyi' | 'bilgi'; metin: string } | null>(null);
  const [bekle, setBekle] = useState(false);

  const yukle = useCallback(async () => {
    try { setV(await api<Veri>(`/api/bulmaca/${id}`)); setHata(null); }
    catch (e) { setHata(e instanceof ApiHatasi ? e.message : 'Yüklenemedi.'); }
  }, [id]);
  useFocusEffect(useCallback(() => { void yukle(); }, [yukle]));

  if (hata) return <View style={{ padding: 16 }}><Uyari metin={hata} /></View>;
  if (!v) return <Yukleniyor />;
  const ui = SEVIYE_UI[v.bilgi.seviye];
  const yorumYazabilir = oyuncu?.tip === 'uye' && v.durum === 'bitti';
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `#${v.bilgi.id} · ${ui.ad}` }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Kart style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <MiniIzgara bulmaca={v.bilgi.bulmaca} boyut={110} />
          <View style={{ flex: 1, gap: 4 }}>
            {v.bilgi.gunlukTarih && <Text style={{ fontFamily: Y.yari, color: R.mavi, fontSize: 12 }}>GÜNÜN SUDOKUSU</Text>}
            <Yazi><Text style={s.kalin}>{sayi(v.bilgi.cozulme)}</Text> kişi çözdü</Yazi>
            <Yazi>Ortalama <Text style={s.kalin}>{sureMetni(v.bilgi.ortalamaSure)}</Text></Yazi>
            <Yazi>Rekor <Text style={s.kalin}>{sureMetni(v.bilgi.rekor)}</Text></Yazi>
          </View>
        </Kart>
        {v.durum === 'bitti'
          ? <Uyari tur="iyi" metin="Bu bulmacayı çözdün." />
          : <Dugme metin={v.durum === 'yarim' ? 'Kaldığın yerden devam et' : 'Çözmeye başla'} onPress={() => router.push(`/oyna/${v.bilgi.seviye}?bulmaca=${v.bilgi.id}`)} />}

        <Kart>
          <Baslik>Sıralama</Baslik>
          {v.siralama.length === 0 ? <Yazi style={{ color: R.soluk }}>Henüz kimse çözmedi. İlk sıraya sen yerleş!</Yazi> : v.siralama.map((x) => (
            <View key={x.sira} style={[s.satir, x.benim && { backgroundColor: R.acik }]}>
              <Text style={[s.sira, x.sira === 1 && { color: '#8A4300' }]}>{x.sira}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.ad} numberOfLines={1}>{x.ad}{x.benim ? '  (sen)' : ''}</Text>
                <Text style={s.ek}>{x.misafir ? 'misafir · ' : ''}{x.yas ? `${x.yas} yaş · ` : ''}{x.hata} hata</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.sure}>{sureMetni(x.sure)}</Text>
                <Text style={s.ek}>{sayi(x.puan)} puan</Text>
              </View>
            </View>
          ))}
        </Kart>

        <Kart>
          <Baslik>Yorumlar · {v.bilgi.yorumSayisi}</Baslik>
          {yorumYazabilir ? (
            <View style={{ gap: 8 }}>
              <TextInput value={metin} onChangeText={(t) => { setMetin(t); setMesaj(null); }} maxLength={500} multiline placeholder="Bu bulmacayı nasıl çözdün? Taktiğini paylaş."
                placeholderTextColor="#8494AB" style={s.giris} accessibilityLabel="Yorumun" />
              {mesaj && <Uyari tur={mesaj.tur} metin={mesaj.metin} />}
              <Dugme tur="mavi" kucuk metin="Yorumu gönder" yukleniyor={bekle} devre={metin.trim().length < 2} onPress={async () => {
                setBekle(true);
                try {
                  const r = await api<{ durum: string }>(`/api/bulmaca/${id}/yorum`, { govde: { metin } });
                  setMetin('');
                  setMesaj(r.durum === 'yayinda' ? { tur: 'iyi', metin: 'Yorumun yayınlandı.' } : { tur: 'bilgi', metin: 'Yorumun onaydan sonra görünecek.' });
                  await yukle();
                } catch (e) { setMesaj({ tur: 'hata', metin: e instanceof ApiHatasi ? e.message : 'Gönderilemedi.' }); }
                finally { setBekle(false); }
              }} />
            </View>
          ) : <Yazi style={{ color: R.soluk, fontSize: 13 }}>Yorum yazmak için bu bulmacayı bitirmiş {oyuncu?.tip === 'uye' ? '' : 've üye '}olmalısın.</Yazi>}
          {v.yorumlar.length === 0 && <Yazi style={{ color: R.soluk }}>Henüz yorum yok.</Yazi>}
          {v.yorumlar.map((y) => (
            <View key={y.id} style={{ gap: 2, paddingVertical: 6 }}>
              <Text style={s.ad}>{y.ad} <Text style={s.ek}>· {y.sure ? `çözdü ${sureMetni(y.sure)}` : 'çözdü'}{y.durum === 'onay-bekliyor' ? ' · onay bekliyor' : ''}</Text></Text>
              <Yazi style={{ lineHeight: 21 }}>{y.metin}</Yazi>
            </View>
          ))}
        </Kart>
      </ScrollView>
      <Banner />
    </View>
  );
}

const s = StyleSheet.create({
  kalin: { fontFamily: Y.kalin, color: R.lacivert },
  satir: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10 },
  sira: { width: 26, fontFamily: Y.kalin, color: R.lacivert, fontSize: 15 },
  ad: { fontFamily: Y.yari, color: R.lacivert, fontSize: 15 },
  ek: { fontFamily: Y.normal, color: R.soluk, fontSize: 12 },
  sure: { fontFamily: Y.yari, color: R.mavi, fontSize: 15, fontVariant: ['tabular-nums'] },
  giris: { minHeight: 80, borderWidth: 1, borderColor: R.cizgi2, borderRadius: 12, padding: 12, fontFamily: Y.normal, fontSize: 15, color: R.yazi, textAlignVertical: 'top' },
});
