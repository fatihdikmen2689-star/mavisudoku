'use client';
import { useState } from 'react';
import Link from 'next/link';

export function SifirlamaIstegiFormu() {
  const [eposta, setEposta] = useState('');
  const [gonderildi, setGonderildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  if (gonderildi) return (
    <div className="form">
      <p className="bilgi" role="status" style={{ margin: 0 }}>Bu e-posta adresiyle bir hesap varsa, şifre yenileme bağlantısı birkaç dakika içinde gelecek. Gereksiz (spam) klasörünü de kontrol et. Bağlantı 1 saat geçerli.</p>
      <Link href="/giris" style={{ fontWeight: 600 }}>Giriş sayfasına dön</Link>
    </div>
  );
  return (
    <form className="form" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta.trim())) { setHata('Geçerli bir e-posta adresi yaz.'); return; }
      setBekle(true);
      try {
        const r = await fetch('/api/sifre-sifirla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eposta }) });
        if (r.ok) setGonderildi(true); else setHata((await r.json()).hata ?? 'İstek gönderilemedi.');
      } catch { setHata('Bağlantı sorunu, tekrar dene.'); } finally { setBekle(false); }
    }}>
      <div className="alan"><label htmlFor="s-eposta">Üye olurken kullandığın e-posta</label><input id="s-eposta" type="email" inputMode="email" autoComplete="email" value={eposta} onChange={(e) => { setEposta(e.target.value); setHata(null); }} /></div>
      {hata && <p className="uyari" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <button type="submit" className="tam-btn" disabled={bekle}>{bekle ? 'Gönderiliyor…' : 'Yenileme bağlantısı gönder'}</button>
    </form>
  );
}

export function YeniSifreFormu({ jeton }: { jeton: string }) {
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  return (
    <form className="form" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (sifre.length < 8) { setHata('Şifre en az 8 karakter olmalı.'); return; }
      if (sifre !== tekrar) { setHata('Şifreler aynı değil.'); return; }
      setBekle(true);
      try {
        const r = await fetch('/api/sifre-yenile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jeton, sifre }) });
        if (r.ok) { window.location.href = '/profil?sifre=yenilendi'; return; }
        setHata((await r.json()).hata ?? 'Şifre yenilenemedi.');
      } catch { setHata('Bağlantı sorunu, tekrar dene.'); } finally { setBekle(false); }
    }}>
      <div className="alan"><label htmlFor="y-sifre">Yeni şifre</label><input id="y-sifre" type="password" autoComplete="new-password" placeholder="En az 8 karakter" value={sifre} onChange={(e) => { setSifre(e.target.value); setHata(null); }} /></div>
      <div className="alan"><label htmlFor="y-tekrar">Yeni şifre (tekrar)</label><input id="y-tekrar" type="password" autoComplete="new-password" value={tekrar} onChange={(e) => { setTekrar(e.target.value); setHata(null); }} /></div>
      {hata && <p className="uyari" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <button type="submit" className="tam-btn" disabled={bekle}>{bekle ? 'Kaydediliyor…' : 'Şifremi yenile ve giriş yap'}</button>
    </form>
  );
}
