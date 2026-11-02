import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, CheckCircle2, CreditCard, Heart, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { api, money, isLocalPreview, tabStorage, type Gift, type Order } from './types';
import { Dialog } from './Dialog';
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');

export function Checkout({gift,initialOrder,mode,onClose,onCatalogChange,onOrderChange}:{gift:Gift|null;initialOrder:Order|null;mode:'demo'|'live';onClose:()=>void;onCatalogChange:()=>void;onOrderChange:(order:Order|null)=>void}) {
  const [order,setOrder]=useState(initialOrder);
  const [method,setMethod]=useState<'pix'|'card'>('pix');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [cancelConfirm,setCancelConfirm]=useState(false);
  const request = useRef({key:crypto.randomUUID(),access:randomToken()});
  const headers:Record<string,string> = order ? {Authorization:`Bearer ${tabStorage.getItem(`order:${order.id}`)||request.current.access}`} : {};
  const create = async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setBusy(true);setError('');
    const form=new FormData(e.currentTarget);
    try {
      const result=await api<Order>('/orders',{method:'POST',headers:{'Idempotency-Key':request.current.key,'X-Order-Token':request.current.access},body:JSON.stringify({giftId:gift!.id,name:form.get('name'),email:form.get('email'),message:form.get('message'),method})});
      tabStorage.setItem(`order:${result.id}`,request.current.access);tabStorage.setItem('lastOrder',result.id);
      setOrder(result);onOrderChange(result);onCatalogChange();
    } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  };
  const simulate = async()=>{setBusy(true);setError('');try{const result=await api<Order>(`/orders/${order!.id}/demo-confirm`,{method:'POST',headers});setOrder(result);onOrderChange(result);onCatalogChange();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const refresh = async()=>{setBusy(true);setError('');try{const result=await api<Order>(`/orders/${order!.id}`,{headers});setOrder(result);onOrderChange(result);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const cancel=async()=>{setBusy(true);try{await api(`/orders/${order!.id}/cancel`,{method:'POST',headers});tabStorage.removeItem('lastOrder');onOrderChange(null);onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const confirmed = order?.status==='confirmed'||order?.status==='demo_confirmed';
  return <Dialog title={confirmed?(order?.mode==='demo'?'Carinho de demonstração!':'Recebemos seu carinho!'):order?'Só mais um passo':'Um presente, muito carinho'} onClose={onClose}>
    {error&&<div className="error-message" role="alert">{error}</div>}
    {confirmed?<div className="confirmation"><span className="confirmation-icon"><CheckCircle2 size={44} strokeWidth={1}/></span><p>{order?.mode==='demo'?'A simulação foi concluída. Nenhum valor foi cobrado.':'Seu pagamento foi verificado e seu presente está registrado. Muito obrigado por fazer parte da nossa história!'}</p><div className="order-summary"><strong>{order?.gift_name}</strong><span>{money(order!.amount_cents)}</span></div><button className="button primary full-width" onClick={onClose}>Voltar para a lista <Heart size={16}/></button></div>
    :order?<div className="payment-step"><div className="order-summary"><strong>{order.gift_name}</strong><span>{money(order.amount_cents)}</span></div>
      {order.mode==='demo'?<><div className="demo-payment"><Sparkles size={28} strokeWidth={1.2}/><h3>Vamos experimentar?</h3><p>Você escolheu {order.method==='pix'?'Pix':'cartão de crédito'}. Esta etapa demonstra a confirmação de um presente e não gera cobrança, QR Pix ou transação bancária.</p></div><button className="button primary full-width" disabled={busy} onClick={simulate}>{busy?'Registrando…':'Simular confirmação do presente'}<Check size={17}/></button><button className="text-button" onClick={()=>setCancelConfirm(!cancelConfirm)}>Cancelar esta reserva de demonstração</button>{cancelConfirm&&<div className="inline-confirm"><p>Liberar este presente para uma nova simulação?</p><button className="button secondary" disabled={busy} onClick={cancel}>Sim, liberar presente</button></div>}</>
      :<><p className="modal-description">Sua reserva está aguardando confirmação. Você escolhe Pix ou cartão no checkout seguro da InfinitePay; a modalidade disponível depende da conta recebedora.</p>{order.checkout_url?<a className="button primary full-width" href={order.checkout_url}>Ir para o checkout seguro <ArrowRight size={17}/></a>:<p className="error-message">A reserva foi registrada, mas o checkout ainda não está disponível. Os noivos precisam conferir a operação no painel.</p>}<button className="button secondary full-width" disabled={busy} onClick={refresh}>{busy?'Consultando…':'Atualizar confirmação'}</button><p className="security-note"><ShieldCheck size={14}/> O presente só é confirmado após verificação do provedor.</p></>}
      <small className="order-reference">Referência: {order.id}</small></div>
    :<form onSubmit={create} className="gift-form"><div className="selected-gift"><img src={gift!.image_url} alt=""/><div><small>{gift!.category}</small><h3>{gift!.name}</h3><strong>{money(gift!.price_cents)}</strong></div></div><p className="modal-description">{gift!.description}</p>
      <label>Seu nome<input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Como os noivos conhecem você"/></label><label>Seu e-mail<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="voce@exemplo.com"/></label><label>Um recadinho para os noivos <span>(opcional)</span><textarea name="message" maxLength={800} rows={3} placeholder="Deixe seus votos de amor e felicidade…"/></label>
      <fieldset className="method-choice"><legend>Como você prefere presentear?</legend><div><button type="button" className={method==='pix'?'chosen':''} aria-pressed={method==='pix'} onClick={()=>setMethod('pix')}><span className="pix-icon">◇</span><span>Pix<small>Prático e simples</small></span>{method==='pix'&&<CheckCircle2 size={16}/>}</button><button type="button" className={method==='card'?'chosen':''} aria-pressed={method==='card'} onClick={()=>setMethod('card')}><CreditCard size={22}/><span>Cartão<small>Checkout InfinitePay</small></span>{method==='card'&&<CheckCircle2 size={16}/>}</button></div></fieldset>
      <p className="form-disclosure">{mode==='demo'?'Modo demonstração: você poderá simular a confirmação, sem efetuar pagamento.':'A escolha final de Pix ou cartão acontece no ambiente seguro da InfinitePay.'}</p>
      <button type="submit" className="button primary full-width" disabled={busy}>{busy?'Preparando seu presente…':mode==='demo'?'Continuar demonstração':'Continuar para pagamento'}<ArrowRight size={17}/></button><p className="security-note"><LockKeyhole size={13}/> {isLocalPreview()?'Prévia local: nenhum dado é enviado aos noivos.':'Sem cadastro. Seus dados ficam em uma área privada dos noivos.'}</p>
    </form>}
  </Dialog>;
}
