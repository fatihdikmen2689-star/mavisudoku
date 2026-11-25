'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Durum = { tur: 'hata' | 'iyi'; metin: string; alan?: string } | null;

async function gonder(url: string, govde: object): Promise<{ ok: boolean; hata?: string; alan?: string }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
    const v = await r.json();
    return { ok: r.ok, hata: v.hata, alan: v.alan };
  } catch {
    return { ok: false, hata: 'Bağlantı sorunu, tekrar dene.' };
  }
}

const Mesaj = ({ d }: { d: Durum }) => d && <p className={d.tur === 'hata' ? 'uyari' : 'bilgi'} role="status" style={{ margin: 0 }}>{d.metin}</p>;

export function AyarFormu({ ilk, yetiskin, rumuz }: { ilk: { ad: string; soyad: string; gorunen: 'rumuz' | 'adsoyad'; yasGoster: boolean; pazarlama: boolean }; yetiskin: boolean; rumuz: string }) {
  const [f, setF] = useState(ilk);
  const [d, setD] = useState<Durum>(null);
  const [bekle, setBekle] = useState(false);
  const router = useRouter();
  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault(); setBekle(true);
      const r = await gonder('/api/hesap/ayar', f);
      setBekle(false);
      setD(r.ok ? { tur: 'iyi', metin: 'Ayarların kaydedildi.' } : { tur: 'hata', metin: r.hata ?? 'Kaydedilemedi.', alan: r.alan });
      if (r.ok) router.refresh();
    }}>
      <div className="ikili">
        <div className="alan"><label htmlFor="p-ad">Ad</label><input id="p-ad" value={f.ad} onChange={(e) => { setF({ ...f, ad: e.target.value }); setD(null); }} autoComplete="given-name" /></div>
        <div className="alan"><label htmlFor="p-soyad">Soyad</label><input id="p-soyad" value={f.soyad} onChange={(e) => { setF({ ...f, soyad: e.target.value }); setD(null); }} autoComplete="family-name" /></div>
      </div>
      <fieldset className="kutu">
        <legend>Sıralamada nasıl görünmek istersin?</legend>
        <label className="onay"><input type="radio" name="gorunen" checked={f.gorunen === 'rumuz'} onChange={() => setF({ ...f, gorunen: 'rumuz' })} />Rumuzumla ({rumuz})</label>
        <label className="onay"><input type="radio" name="gorunen" disabled={!yetiskin} checked={f.gorunen === 'adsoyad'} onChange={() => setF({ ...f, gorunen: 'adsoyad' })} />Adım soyadımla ({f.ad} {f.soyad}){!yetiskin && ' · 18 yaş ve üzeri'}</label>
        {yetiskin && <label className="onay" style={{ borderTop: '1px solid #E4EBF5', marginTop: 6, paddingTop: 6 }}><input type="checkbox" checked={f.yasGoster} onChange={(e) => setF({ ...f, yasGoster: e.target.checked })} />Yaşım sıralamada görünsün</label>}
      </fieldset>
      <label className="onay"><input type="checkbox" checked={f.pazarlama} onChange={(e) => setF({ ...f, pazarlama: e.target.checked })} />Turnuva ve yenilik e-postaları almak istiyorum</label>
      <Mesaj d={d} />
      <div><button type="submit" className="btn-mavi" style={{ minHeight: 44, padding: '0 20px' }} disabled={bekle}>{bekle ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
      <p className="ipucu" style={{ margin: 0 }}>Rumuz ve e-posta değiştirilemez: arkadaşların seni rumuzunla bulur.</p>
    </form>
  );
}

export function SifreFormu() {
  const [eski, setEski] = useState('');
  const [yeni, setYeni] = useState('');
  const [d, setD] = useState<Durum>(null);
  const [bekle, setBekle] = useState(false);
  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault(); setBekle(true);
      const r = await gonder('/api/hesap/sifre', { eski, yeni });
      setBekle(false);
      if (r.ok) { setEski(''); setYeni(''); setD({ tur: 'iyi', metin: 'Şifren değişti. Diğer cihazlardaki oturumların kapatıldı.' }); }
      else setD({ tur: 'hata', metin: r.hata ?? 'Değiştirilemedi.' });
    }}>
      <div className="ikili">
        <div className="alan"><label htmlFor="p-eski">Mevcut şifre</label><input id="p-eski" type="password" autoComplete="current-password" value={eski} onChange={(e) => { setEski(e.target.value); setD(null); }} /></div>
        <div className="alan"><label htmlFor="p-yeni">Yeni şifre</label><input id="p-yeni" type="password" autoComplete="new-password" placeholder="En az 8 karakter" value={yeni} onChange={(e) => { setYeni(e.target.value); setD(null); }} /></div>
      </div>
      <Mesaj d={d} />
      <div><button type="submit" className="btn-mavi" style={{ minHeight: 44, padding: '0 20px' }} disabled={bekle || !eski || !yeni}>Şifreyi değiştir</button></div>
    </form>
  );
}

export function HesapSilFormu() {
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState('');
  const [onay, setOnay] = useState('');
  const [d, setD] = useState<Durum>(null);
  const [bekle, setBekle] = useState(false);
  if (!acik) return <div><button type="button" className="ikincil-btn" style={{ color: 'var(--kirmizi)' }} onClick={() => setAcik(true)}>Hesabımı sil</button></div>;
  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault(); setBekle(true);
      const r = await gonder('/api/hesap/sil', { sifre, onay });
      setBekle(false);
      if (r.ok) window.location.href = '/?hesap=silindi';
      else setD({ tur: 'hata', metin: r.hata ?? 'Silinemedi.' });
    }}>
      <p className="uyari" style={{ margin: 0 }}>Hesabın, çözdüğün bulmacalar, sıralamadaki yerlerin, yorumların ve maçların kalıcı olarak silinir. Bu işlem geri alınamaz.</p>
      <div className="ikili">
        <div className="alan"><label htmlFor="p-sil-sifre">Şifren</label><input id="p-sil-sifre" type="password" autoComplete="current-password" value={sifre} onChange={(e) => { setSifre(e.target.value); setD(null); }} /></div>
        <div className="alan"><label htmlFor="p-sil-onay">Onaylamak için SİL yaz</label><input id="p-sil-onay" value={onay} onChange={(e) => { setOnay(e.target.value); setD(null); }} autoComplete="off" /></div>
      </div>
      <Mesaj d={d} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="btn-mavi" style={{ minHeight: 44, padding: '0 20px', background: 'var(--kirmizi)' }} disabled={bekle || !sifre || !onay}>Hesabımı kalıcı olarak sil</button>
        <button type="button" className="ikincil-btn" onClick={() => { setAcik(false); setSifre(''); setOnay(''); }}>Vazgeç</button>
      </div>
    </form>
  );
}
