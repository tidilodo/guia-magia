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

    const ref = JSON.parse(pag.external_reference || '{}');
    const plano = ref.plano || 'basico';
    const email = pag.payer?.email || '';
    const nome  = `${pag.payer?.first_name || ''} ${pag.payer?.last_name || ''}`.trim() || 'Praticante';

    if (email) {
      await enviarPDFs(email, nome, plano);
    }

    // Registra no Google Sheets se configurado
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

async function enviarPDFs(email, nome, plano) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    console.warn('RESEND_API_KEY não configurado — email não enviado');
    return;
  }

  const primeiroNome = nome.split(' ')[0] || 'Praticante';

  // URLs dos PDFs hospedados no Vercel (pasta public)
  const appUrl = process.env.APP_URL || 'https://guia-magia.vercel.app';
  const pdfs = [
    { nome: 'Fundamentos da Magia Atual (Bônus)', url: `${appUrl}/pdfs/fundamentos.pdf` },
    { nome: 'PDF 01 — Fogo: A Chama que Transforma', url: `${appUrl}/pdfs/fogo.pdf` },
    { nome: 'PDF 02 — Água: O Fluxo que Cura', url: `${appUrl}/pdfs/agua.pdf` },
    { nome: 'PDF 03 — Terra: A Força que Sustenta', url: `${appUrl}/pdfs/terra.pdf` },
    { nome: 'PDF 04 — Ar: A Voz que Manifesta', url: `${appUrl}/pdfs/ar.pdf` },
  ];

  const linhasPDFs = pdfs.map(p =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #2e2028;">
      <span style="color:#c9913a;margin-right:8px">✦</span>
      <a href="${p.url}" style="color:#e8b96a;text-decoration:none;font-size:14px">${p.nome}</a>
    </td></tr>`
  ).join('');

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#120d0f;color:#d4c4b0;padding:40px 32px;border-radius:12px;">
    <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9913a;margin-bottom:24px">Guilda da Fonte</p>
    <h1 style="font-size:26px;color:#f5ede0;font-weight:400;margin-bottom:8px;line-height:1.3">Sua Box dos 4 Elementos chegou, ${primeiroNome}.</h1>
    <p style="font-size:14px;color:#8a7a6a;margin-bottom:32px">Os caminhos se abrem para quem se prepara com intenção.</p>

    <div style="background:#1e1519;border:1px solid #2e2028;border-radius:8px;padding:24px;margin-bottom:32px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9913a;margin-bottom:16px">Seus guias</p>
      <table style="width:100%;border-collapse:collapse">${linhasPDFs}</table>
    </div>

    <p style="font-size:14px;line-height:1.8;margin-bottom:16px">
      Comece pelo guia de <strong style="color:#f5ede0">Fundamentos</strong> — ele prepara você para tirar o máximo de cada elemento. Depois escolha o que mais ressoa com você neste momento.
    </p>
    <p style="font-size:14px;line-height:1.8;margin-bottom:32px;color:#8a7a6a">
      Os PDFs ficam disponíveis nos links acima para sempre. Salve este email.
    </p>

    <div style="border-top:1px solid #2e2028;padding-top:24px;text-align:center">
      <p style="font-size:12px;color:#8a7a6a">Dúvidas? Fale com a Guilda:</p>
      <a href="https://wa.me/5562992038987" style="display:inline-block;margin-top:10px;background:#25D366;color:#000;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:10px 24px;border-radius:3px;text-decoration:none">💬 WhatsApp (62) 99203-8987</a>
    </div>

    <p style="font-size:11px;color:#4a3a3a;text-align:center;margin-top:28px">© 2026 Guilda da Fonte · guia-magia.vercel.app</p>
  </div>`;

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    'Guilda da Fonte <entrega@guilda.com.br>',
      to:      [email],
      subject: '✦ Sua Box dos 4 Elementos — Guilda da Fonte',
      html,
    }),
  });
}
