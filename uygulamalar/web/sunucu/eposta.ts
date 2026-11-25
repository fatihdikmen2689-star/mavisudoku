/**
 * E-posta gönderimi. SMTP_URL tanımlıysa (ör. smtps://kullanici:sifre@smtp-relay.brevo.com:465) o servis kullanılır;
 * tanımlı değilse e-posta sunucu kaydına yazılır (geliştirme ve testler için). Böylece hangi e-posta servisi
 * seçilirse seçilsin kod değişmez; yalnızca ortam değişkeni girilir.
 */
import nodemailer from 'nodemailer';

export interface Eposta { kime: string; konu: string; metin: string; html: string }

const g = globalThis as unknown as { __msPosta?: nodemailer.Transporter; __msGiden?: Eposta[] };

/** Testlerin gönderilen e-postaları görebilmesi için (SMTP yokken) */
export const gidenEpostalar = (): Eposta[] => (g.__msGiden ??= []);

export async function epostaGonder(e: Eposta): Promise<void> {
  const url = process.env.SMTP_URL;
  if (!url) {
    gidenEpostalar().push(e);
    // Yayında içerik (ör. şifre bağlantısı) kayda yazılmaz; deneme sunucusunda EPOSTA_KAYDI=konsol ile açılabilir
    if (process.env.NODE_ENV !== 'production' || process.env.EPOSTA_KAYDI === 'konsol') console.info(`[e-posta] ${e.kime} · ${e.konu}\n${e.metin}`);
    else console.warn(`[e-posta] SMTP_URL tanımlı değil, gönderilmedi: ${e.konu}`);
    return;
  }
  g.__msPosta ??= nodemailer.createTransport(url);
  await g.__msPosta.sendMail({
    from: process.env.EPOSTA_GONDEREN ?? 'MaviSudoku <bildirim@mavisudoku.com>',
    to: e.kime, subject: e.konu, text: e.metin, html: e.html,
  });
}

const kacis = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Sade, her e-posta programında düzgün görünen şablon */
export function sablon(baslik: string, paragraflar: string[], dugme?: { metin: string; adres: string }, not?: string): string {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#F2F5FA;font-family:Arial,Helvetica,sans-serif;color:#0B2545">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0B2545;padding:18px 24px;font-size:20px;font-weight:bold;color:#fff">Mavi<span style="color:#7FB2FF">Sudoku</span></td></tr>
<tr><td style="padding:26px 24px">
<h1 style="margin:0 0 14px;font-size:21px">${kacis(baslik)}</h1>
${paragraflar.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#22314A">${kacis(p)}</p>`).join('')}
${dugme ? `<p style="margin:22px 0"><a href="${kacis(dugme.adres)}" style="display:inline-block;background:#F28C28;color:#3D1E00;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:10px">${kacis(dugme.metin)}</a></p>
<p style="margin:0 0 14px;font-size:12px;color:#4A5A72;word-break:break-all">Düğme çalışmazsa bu adresi tarayıcına yapıştır: ${kacis(dugme.adres)}</p>` : ''}
${not ? `<p style="margin:18px 0 0;font-size:12px;color:#4A5A72">${kacis(not)}</p>` : ''}
</td></tr></table></td></tr></table></body></html>`;
}
