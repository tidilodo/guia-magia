/**
 * Endpoint de teste — simula o envio do email de entrega.
 * Uso: POST /api/teste-email  body: { email: "seu@email.com", plano: "basico"|"completo" }
 */
import { enviarBasico, enviarCompleto } from './webhook.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, plano = 'basico' } = req.body || {};
  if (!email) return res.status(400).json({ erro: 'email obrigatório' });

  try {
    const nome = email.split('@')[0];
    if (plano === 'completo') {
      await enviarCompleto(email, nome);
    } else {
      await enviarBasico(email, nome);
    }
    return res.status(200).json({ ok: true, enviado_para: email, plano });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}
