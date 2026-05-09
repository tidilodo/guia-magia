export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body || {};
  if (type !== 'payment') return res.status(200).end();

  try {
    const pagResp = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const pag = await pagResp.json();
    if (pag.status !== 'approved') return res.status(200).end();

    const ref   = JSON.parse(pag.external_reference || '{}');
    const plano = ref.plano || 'basico';
    const email = pag.payer?.email || '';
    const nome  = `${pag.payer?.first_name || ''} ${pag.payer?.last_name || ''}`.trim() || 'Praticante';

    if (email) {
      if (plano === 'completo') {
        await enviarCompleto(email, nome);
      } else {
        await enviarBasico(email, nome);
      }
    }

    if (process.env.SHEETS_URL) {
      await fetch(process.env.SHEETS_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data:      new Date().toLocaleString('pt-BR'),
          nome, email, plano,
          valor:     pag.transaction_amount,
          pagamento: pag.id,
          ref:       ref.ref || '',
          status:    'pago',
        }),
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook:', err);
    return res.status(500).end();
  }
}

const appUrl = () => process.env.APP_URL || 'https://guia-magia.vercel.app';

const PDFS_BASICO = (url) => [
  { nome: 'Fundamentos da Magia Atual (Bônus)', url: `${url}/pdfs/fundamentos.pdf` },
  { nome: 'PDF 01 — Fogo: A Chama que Transforma', url: `${url}/pdfs/fogo.pdf` },
  { nome: 'PDF 02 — Água: O Fluxo que Cura', url: `${url}/pdfs/agua.pdf` },
  { nome: 'PDF 03 — Terra: A Força que Sustenta', url: `${url}/pdfs/terra.pdf` },
  { nome: 'PDF 04 — Ar: A Voz que Manifesta', url: `${url}/pdfs/ar.pdf` },
];

const PDFS_COMPLETO = (url) => [
  ...PDFS_BASICO(url),
  { nome: '✦ Calendário Lunar — 3 Meses de Prática', url: `${url}/pdfs/calendario-lunar.pdf` },
  { nome: '✦ Protocolo 21 Dias — Jornada pelos 4 Elementos', url: `${url}/pdfs/protocolo-21-dias.pdf` },
  { nome: '✦ Meditações Guiadas — Os 4 Elementos (scripts)', url: `${url}/pdfs/meditacoes-guiadas.pdf` },
];

function linhasTabela(pdfs) {
  return pdfs.map(p =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #2e2028;">
      <span style="color:#c9913a;margin-right:8px">✦</span>
      <a href="${p.url}" style="color:#e8b96a;text-decoration:none;font-size:14px">${p.nome}</a>
    </td></tr>`
  ).join('');
}

function emailBase(primeiroNome, tituloH1, subtitulo, secaoExtra, pdfs) {
  const url = appUrl();
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#120d0f;color:#d4c4b0;padding:40px 32px;border-radius:12px;">
    <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9913a;margin-bottom:24px">Guilda da Fonte</p>
    <h1 style="font-size:26px;color:#f5ede0;font-weight:400;margin-bottom:8px;line-height:1.3">${tituloH1}, ${primeiroNome}.</h1>
    <p style="font-size:14px;color:#8a7a6a;margin-bottom:32px">${subtitulo}</p>

    <div style="background:#1e1519;border:1px solid #2e2028;border-radius:8px;padding:24px;margin-bottom:32px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9913a;margin-bottom:16px">Seus guias</p>
      <table style="width:100%;border-collapse:collapse">${linhasTabela(pdfs)}</table>
    </div>

    ${secaoExtra}

    <p style="font-size:14px;line-height:1.8;margin-bottom:16px">
      Comece pelo guia de <strong style="color:#f5ede0">Fundamentos</strong> — ele prepara você para tirar o máximo de cada elemento.
    </p>
    <p style="font-size:14px;line-height:1.8;margin-bottom:32px;color:#8a7a6a">
      Os PDFs ficam disponíveis nos links acima para sempre. Salve este email.
    </p>

    <div style="border-top:1px solid #2e2028;padding-top:24px;text-align:center">
      <p style="font-size:12px;color:#8a7a6a">Dúvidas ou suporte? Fale com a Guilda:</p>
      <a href="https://wa.me/5562992038987" style="display:inline-block;margin-top:10px;background:#25D366;color:#000;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:10px 24px;border-radius:3px;text-decoration:none">💬 WhatsApp (62) 99203-8987</a>
    </div>

    <p style="font-size:11px;color:#4a3a3a;text-align:center;margin-top:28px">© 2026 Guilda da Fonte · guia-magia.vercel.app</p>
  </div>`;
}

async function enviar(email, assunto, html) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) { console.warn('RESEND_API_KEY não configurado'); return; }

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Guilda da Fonte <onboarding@resend.dev>',
      to:   [email],
      subject: assunto,
      html,
    }),
  });
}

async function enviarBasico(email, nome) {
  const primeiroNome = nome.split(' ')[0] || 'Praticante';
  const pdfs = PDFS_BASICO(appUrl());
  const html = emailBase(
    primeiroNome,
    'Sua Box dos 4 Elementos chegou',
    'Os caminhos se abrem para quem se prepara com intenção.',
    '',
    pdfs,
  );
  await enviar(email, '✦ Sua Box dos 4 Elementos — Guilda da Fonte', html);
}

async function enviarCompleto(email, nome) {
  const primeiroNome = nome.split(' ')[0] || 'Praticante';
  const pdfs = PDFS_COMPLETO(appUrl());
  const secaoExtra = `
    <div style="background:#1a0e05;border:1px solid #c9913a;border-radius:8px;padding:20px 24px;margin-bottom:32px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9913a;margin-bottom:8px">Box Completa — seus bônus exclusivos</p>
      <p style="font-size:13px;color:#d4c4b0;line-height:1.7;margin:0">
        Além dos 5 guias dos elementos, você recebeu o <strong style="color:#f5ede0">Calendário Lunar de 3 meses</strong>, o <strong style="color:#f5ede0">Protocolo de 21 Dias</strong> e os <strong style="color:#f5ede0">Scripts das Meditações Guiadas</strong>.<br><br>
        O suporte via WhatsApp está disponível por <strong style="color:#e8b96a">30 dias</strong> — use sempre que precisar de orientação na sua prática.
      </p>
    </div>`;
  const html = emailBase(
    primeiroNome,
    'Sua Box Completa chegou',
    'Você escolheu a jornada mais profunda. Os caminhos se abrem.',
    secaoExtra,
    pdfs,
  );
  await enviar(email, '✦ Sua Box Completa — Guilda da Fonte', html);
}
