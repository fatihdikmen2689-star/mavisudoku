'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Hatalar = Partial<Record<string, string>>;

async function gonder(url: string, govde: object): Promise<{ ok: boolean; veri: { hata?: string; alan?: string; aktarilan?: number } }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
    return { ok: r.ok, veri: await r.json() };
  } catch {
    return { ok: false, veri: { hata: 'Bağlantı sorunu. Tekrar dene.' } };
  }
}

export function KayitFormu({ misafirAdi, yil }: { misafirAdi: string | null; yil: number }) {
  const [f, setF] = useState({ ad: '', soyad: '', rumuz: '', eposta: '', sifre: '', dogumYili: '', gorunen: 'rumuz', yasGoster: false, aktar: true, kvkk: false, pazarlama: false });
  const [hatalar, setHatalar] = useState<Hatalar>({});
  const [genel, setGenel] = useState<string | null>(null);
  const [rumuzDurum, setRumuzDurum] = useState<{ musait: boolean; neden?: string } | null>(null);
  const [bekle, setBekle] = useState(false);
  const yas = f.dogumYili ? yil - Number(f.dogumYili) : null;

  useEffect(() => {
    const r = f.rumuz.trim().toLowerCase();
    if (r.length < 3) { setRumuzDurum(null); return; }
    const t = setTimeout(async () => {
      try { setRumuzDurum(await (await fetch(`/api/rumuz?ad=${encodeURIComponent(r)}`)).json()); } catch { /* yok say */ }
    }, 350);
    return () => clearTimeout(t);
  }, [f.rumuz]);

  const degis = (alan: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF({ ...f, [alan]: v });
    setHatalar({ ...hatalar, [alan]: undefined });
  };

  const gonderForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const h: Hatalar = {};
    if (!f.ad.trim()) h.ad = 'Adını yaz.';
    if (!f.soyad.trim()) h.soyad = 'Soyadını yaz.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.eposta.trim())) h.eposta = 'Geçerli bir e-posta adresi yaz.';
    if (f.sifre.length < 8) h.sifre = 'Şifre en az 8 karakter olmalı.';
    if (!f.dogumYili) h.dogumYili = 'Doğum yılını seç.';
    if (f.rumuz.trim().length < 3) h.rumuz = 'Rumuz en az 3 karakter olmalı.';
    if (!f.kvkk) h.kvkk = 'Devam etmek için onaylamalısın.';
    setHatalar(h);
    if (Object.keys(h).length) return;
    setBekle(true);
    setGenel(null);
    const { ok, veri } = await gonder('/api/kayit', { ...f, dogumYili: Number(f.dogumYili), rumuz: f.rumuz.trim().toLowerCase() });
    setBekle(false);
    if (ok) { window.location.href = '/'; return; }
    if (veri.alan) setHatalar({ [veri.alan]: veri.hata });
    else setGenel(veri.hata ?? 'Kayıt tamamlanamadı.');
  };

  const giris = (ad: keyof typeof f, etiket: string, tip = 'text', ek: object = {}) => (
    <div className="alan">
      <label htmlFor={`k-${ad}`}>{etiket}</label>
      <input id={`k-${ad}`} type={tip} value={String(f[ad])} onChange={degis(ad)} aria-invalid={!!hatalar[ad]} aria-describedby={hatalar[ad] ? `k-${ad}-h` : undefined} {...ek} />
      {hatalar[ad] && <p className="hata" id={`k-${ad}-h`}>{hatalar[ad]}</p>}
    </div>
  );

  return (
    <form className="form" onSubmit={gonderForm} noValidate>
      <div className="ikili">{giris('ad', 'Ad', 'text', { autoComplete: 'given-name' })}{giris('soyad', 'Soyad', 'text', { autoComplete: 'family-name' })}</div>
      <div className="alan">
        <label htmlFor="k-rumuz">Rumuz (kullanıcı adı)</label>
        <input id="k-rumuz" type="text" value={f.rumuz} onChange={degis('rumuz')} autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={!!hatalar.rumuz || rumuzDurum?.musait === false} />
        {hatalar.rumuz ? <p className="hata">{hatalar.rumuz}</p>
          : rumuzDurum ? <p className={rumuzDurum.musait ? 'iyi' : 'hata'}>{rumuzDurum.musait ? '✓ Bu rumuz kullanılabilir · Arkadaşların seni bununla bulur' : rumuzDurum.neden}</p>
          : <p className="ipucu">Küçük harf, rakam, nokta ve alt çizgi; 3–20 karakter.</p>}
      </div>
      {giris('eposta', 'E-posta', 'email', { autoComplete: 'email', inputMode: 'email' })}
      <div className="ikili">
        {giris('sifre', 'Şifre', 'password', { autoComplete: 'new-password', placeholder: 'En az 8 karakter' })}
        <div className="alan">
          <label htmlFor="k-yil">Doğum yılı</label>
          <select id="k-yil" value={f.dogumYili} onChange={degis('dogumYili')} aria-invalid={!!hatalar.dogumYili}>
            <option value="">Seç</option>
            {Array.from({ length: 98 }, (_, i) => yil - 5 - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {hatalar.dogumYili && <p className="hata">{hatalar.dogumYili}</p>}
        </div>
      </div>
      <p style={{ margin: '-6px 0 0', fontSize: 12, color: 'var(--soluk)' }}>13 yaşından küçükler üye olamaz, misafir olarak oynayabilir. 18 yaşından küçüklerin adı ve yaşı sıralamada gösterilmez.</p>
      {yas !== null && yas >= 13 && (
        <fieldset className="kutu">
          <legend>Sıralamada nasıl görünmek istersin?</legend>
          <label className="onay"><input type="radio" name="gorunen" checked={f.gorunen === 'rumuz' || yas < 18} onChange={() => setF({ ...f, gorunen: 'rumuz' })} />Rumuzumla{f.rumuz ? ` (${f.rumuz.trim().toLowerCase()})` : ''}</label>
          <label className="onay"><input type="radio" name="gorunen" disabled={yas < 18} checked={f.gorunen === 'adsoyad' && yas >= 18} onChange={() => setF({ ...f, gorunen: 'adsoyad' })} />Adım soyadımla{f.ad ? ` (${f.ad} ${f.soyad})` : ''}{yas < 18 ? ' · 18 yaş ve üzeri' : ''}</label>
          {yas >= 18 && <label className="onay" style={{ borderTop: '1px solid #E4EBF5', marginTop: 6, paddingTop: 6 }}><input type="checkbox" checked={f.yasGoster} onChange={degis('yasGoster')} />Yaşım sıralamada görünsün</label>}
        </fieldset>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {misafirAdi && <label className="onay"><input type="checkbox" checked={f.aktar} onChange={degis('aktar')} /><span><strong>{misafirAdi}</strong> olarak çözdüklerimi hesabıma aktar</span></label>}
        <label className="onay"><input type="checkbox" checked={f.kvkk} onChange={degis('kvkk')} aria-invalid={!!hatalar.kvkk} /><span><Link href="/kullanim-kosullari" style={{ fontWeight: 800 }}>Kullanım koşullarını</Link> kabul ediyorum ve <Link href="/gizlilik" style={{ fontWeight: 800 }}>KVKK aydınlatma metnini</Link> okudum. <span style={{ color: 'var(--kirmizi)' }}>(zorunlu)</span></span></label>
        {hatalar.kvkk && <p className="alan" style={{ margin: 0 }}><span className="hata" style={{ display: 'block' }}>{hatalar.kvkk}</span></p>}
        <label className="onay"><input type="checkbox" checked={f.pazarlama} onChange={degis('pazarlama')} /><span>Turnuva ve yenilik e-postaları almak istiyorum. <span style={{ color: 'var(--soluk)' }}>(isteğe bağlı)</span></span></label>
      </div>
      {genel && <p className="uyari" role="alert" style={{ margin: 0 }}>{genel}</p>}
      <button type="submit" className="tam-btn" disabled={bekle}>{bekle ? 'Hesabın oluşturuluyor…' : 'Hesabımı oluştur'}</button>
    </form>
  );
}

export function GirisFormu({ misafirAdi }: { misafirAdi: string | null }) {
  const [kimlik, setKimlik] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  return (
    <form className="form" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (!kimlik.trim() || !sifre) { setHata('E-posta/rumuz ve şifreni yaz.'); return; }
      setBekle(true);
      const { ok, veri } = await gonder('/api/giris', { kimlik, sifre });
      setBekle(false);
      if (ok) window.location.href = '/';
      else setHata(veri.hata ?? 'Giriş yapılamadı.');
    }}>
      <div className="alan"><label htmlFor="g-kimlik">E-posta veya rumuz</label><input id="g-kimlik" type="text" autoComplete="username" autoCapitalize="none" value={kimlik} onChange={(e) => { setKimlik(e.target.value); setHata(null); }} /></div>
      <div className="alan"><label htmlFor="g-sifre">Şifre</label><input id="g-sifre" type="password" autoComplete="current-password" value={sifre} onChange={(e) => { setSifre(e.target.value); setHata(null); }} /></div>
      {hata && <p className="uyari" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <button type="submit" className="tam-btn" disabled={bekle}>{bekle ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
      {misafirAdi && <p style={{ margin: 0, fontSize: 13, color: 'var(--soluk)', textAlign: 'center' }}>Giriş yapınca <strong>{misafirAdi}</strong> olarak çözdüklerin hesabına eklenir.</p>}
      <p style={{ margin: 0, fontSize: 13, color: 'var(--soluk)', textAlign: 'center' }}>Şifreni mi unuttun? Şifre sıfırlama e-postası yayına alırken eklenecek; şimdilik destek ekibine yaz.</p>
    </form>
  );
}
