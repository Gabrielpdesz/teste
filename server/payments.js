import { StoreError } from './store.js';

// Adaptador preliminar: validar este contrato na documentação oficial antes de habilitar live.
export function infinitePay({ handle, publicUrl, fetchImpl = fetch }) {
  const base = 'https://api.infinitepay.io/invoices/public/checkout';
  const request = async (path, body) => {
    const response = await fetchImpl(`${base}/${path}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
    });
    if (!response.ok) throw new StoreError('O provedor não conseguiu concluir a operação. A reserva foi preservada para conferência.', 502);
    return response.json();
  };
  return {
    async checkout(order, hookToken) {
      const result = await request('links', {
        handle, order_nsu: order.id,
        redirect_url: `${publicUrl}/obrigado?order=${encodeURIComponent(order.id)}`,
        webhook_url: `${publicUrl}/api/webhooks/infinitepay/${order.id}/${hookToken}`,
        items: [{ quantity: 1, price: order.amount_cents, description: order.gift_name }],
        customer: { name: order.guest_name, email: order.email },
      });
      let url;
      try { url = new URL(result.url); } catch { throw new StoreError('O provedor retornou um checkout inválido.', 502); }
      if (url.protocol !== 'https:' || url.username || url.password || !(url.hostname === 'infinitepay.io' || url.hostname.endsWith('.infinitepay.io'))) {
        throw new StoreError('O endereço de pagamento não pertence ao provedor.', 502);
      }
      return url.toString();
    },
    async verify(order, identifiers) {
      const result = await request('payment_check', { handle, order_nsu: order.id,
        transaction_nsu: identifiers.transaction_nsu, slug: identifiers.slug });
      if (result.order_nsu !== undefined && result.order_nsu !== order.id) throw new StoreError('A transação não corresponde ao pedido.', 422);
      if (result.transaction_nsu !== undefined && result.transaction_nsu !== identifiers.transaction_nsu) throw new StoreError('Identificador de transação divergente.', 422);
      return { ...result, transaction_nsu: identifiers.transaction_nsu, slug: identifiers.slug };
    },
  };
}
