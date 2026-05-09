export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { plano, ref } = req.body || {};

  const precos = {
    basico:   { valor: 37.00, titulo: 'Guia de Magia Atual — Box dos 4 Elementos' },
    completo: { valor: 97.00, titulo: 'Guia de Magia Atual — Box Completa + Suporte' },
  };

  if (!precos[plano]) return res.status(400).json({ erro: 'Plano inválido' });

  const appUrl = process.env.APP_URL || 'https://guia-magia.vercel.app';

  const body = {
    items: [{
      title:       precos[plano].titulo,
      quantity:    1,
      unit_price:  precos[plano].valor,
      currency_id: 'BRL',
    }],
    external_reference: JSON.stringify({ plano, ref: ref || '' }),
    back_urls: {
      success: `${appUrl}/obrigado.html`,
      failure: `${appUrl}/obrigado.html`,
      pending: `${appUrl}/obrigado.html`,
    },
    auto_return:          'approved',
    notification_url:     `${appUrl}/api/webhook`,
    statement_descriptor: 'GUILDA DA FONTE',
  };

  try {
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });
    const dados = await resp.json();
    if (!resp.ok) return res.status(500).json({ erro: 'Erro MP', detalhe: dados });
    return res.status(200).json({ url: dados.init_point });
  } catch (err) {
    console.error('criar-pagamento:', err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
