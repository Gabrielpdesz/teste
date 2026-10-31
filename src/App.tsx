import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, Check, CheckCircle2, ChevronDown, CreditCard, Gift as GiftIcon, Heart, Leaf, LockKeyhole, Menu, Minus, Plus, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api, money, asset, isLocalPreview, tabStorage, type Gift, type Order } from './types';
import { Admin } from './Admin';
import { BrandMark } from './BrandMark';

const categories = ['Todos os presentes','Lua de mel','Nosso lar','Experiências','Carinhos'];
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');

export function App() {
  if (window.location.pathname.startsWith('/admin')) return <Admin />;
  return <Wedding />;
}

function Wedding() {
  const [gifts,setGifts] = useState<Gift[]>([]);
  const [mode,setMode] = useState<'demo'|'live'>('demo');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [category,setCategory] = useState(categories[0]);
  const [search,setSearch] = useState('');
  const [sort,setSort] = useState('featured');
  const [selected,setSelected] = useState<Gift|null>(null);
  const [order,setOrder] = useState<Order|null>(null);
  const [recentOrder,setRecentOrder] = useState<Order|null>(null);
  const [menu,setMenu] = useState(false);
  const [faq,setFaq] = useState<number|null>(0);
  const [privacy,setPrivacy] = useState(false);
  const [previewInfo,setPreviewInfo] = useState(false);
  const preview=isLocalPreview();
  const [returnError,setReturnError] = useState('');
  const load = () => Promise.all([api<Gift[]>('/gifts'),api<{mode:'demo'|'live'}>('/config')])
    .then(([g,c])=>{setGifts(g);setMode(c.mode);setError('');}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  useEffect(()=>{void load();},[]);
  useEffect(()=>{
    const id=tabStorage.getItem('lastOrder');
    const access=id&&tabStorage.getItem(`order:${id}`);
    if(id&&access) api<Order>(`/orders/${id}`,{headers:{Authorization:`Bearer ${access}`}})
      .then(o=>{if(o.status!=='cancelled')setRecentOrder(o);}).catch(()=>{});
  },[]);
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const id = params.get('order');
    if (!id) return;
    const access = tabStorage.getItem(`order:${id}`);
    if (!access) {setReturnError('Para acompanhar este presente, use o mesmo navegador em que iniciou o pagamento. O casal também poderá conferir o pedido no painel.');return;}
    api<Order>(`/orders/${id}`,{headers:{Authorization:`Bearer ${access}`}}).then(setOrder).catch(e=>setReturnError(e.message));
    const nsu = params.get('transaction_nsu'); const slug = params.get('slug') || params.get('invoice_slug');
    if (nsu && slug) api<Order>(`/orders/${id}/verify`,{method:'POST',headers:{Authorization:`Bearer ${access}`},body:JSON.stringify({transaction_nsu:nsu,slug})})
      .then(setOrder).catch(e=>setReturnError(e.message));
  },[]);
  const visible = useMemo(()=>gifts.filter(g=>(category===categories[0]||g.category===category) && `${g.name} ${g.description}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
    .sort((a,b)=>sort==='asc'?a.price_cents-b.price_cents:sort==='desc'?b.price_cents-a.price_cents:0),[gifts,category,search,sort]);
  const closeCheckout = () => {setSelected(null);setOrder(null);void load();};
  const faqs = [
    ['Como funciona a lista de presentes?','Escolha um presente que tenha a nossa cara e deixe seu nome e um recadinho, se quiser. Os presentes são simbólicos: cada contribuição nos ajuda a realizar os planos dessa nova vida juntos. Você não precisa criar uma conta.'],
    ['Posso pagar com Pix ou cartão?','Sim, o projeto prevê Pix e cartão no checkout seguro da InfinitePay, conforme as modalidades disponíveis para a nossa conta. Nesta versão de demonstração, nenhum valor é cobrado.'],
    ['Como sei se meu presente foi confirmado?','A confirmação aparece depois que o servidor verifica o pagamento com o provedor. Se você voltar do checkout e ainda aparecer “aguardando”, use o botão de atualizar; o retorno à página não confirma uma cobrança sozinho.'],
    ['Preciso levar um presente no dia do casamento?','Não precisa! Nossa lista é virtual. O presente se transforma em uma contribuição para os nossos planos. E a sua presença já torna esse momento ainda mais especial.'],
  ];
  return <>
    <header className="site-header"><a className="monogram" href="#inicio" aria-label="Maria Clara e Gabriel, início"><BrandMark/></a>
      <nav aria-label="Navegação principal" className={menu?'nav-open':''}>
        <a href="#nossa-historia" onClick={()=>setMenu(false)}>Nosso grande dia</a><a className="active" href="#presentes" onClick={()=>setMenu(false)}>Lista de presentes</a><a href="#duvidas" onClick={()=>setMenu(false)}>Dúvidas frequentes</a>
      </nav><a className="header-date" href="#inicio">20.08.2028 <Heart size={13}/></a>
      <button className="mobile-menu icon-button" aria-label={menu?'Fechar menu':'Abrir menu'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
    </header>
    <main>
      <section id="inicio" className="hero">
        <div className="hero-copy"><p className="eyebrow"><span/> O COMEÇO DO NOSSO PARA SEMPRE</p>
          <h1>Maria Clara <span className="amp">&</span><br/>Gabriel</h1>
          <p className="hero-date">20 DE AGOSTO DE 2028 <span>·</span> DOMINGO</p>
          <p className="hero-description">A vida fica mais bonita quando compartilhamos<br className="desktop-break"/> nossos sonhos com quem amamos.</p>
          <a className="button primary" href="#presentes">Conheça nossa lista <ArrowDown size={16}/></a>
          <div className="hero-note"><span className="tiny-line"/> COM AMOR, PARA VIVER NOVAS HISTÓRIAS</div>
        </div>
        <div className="hero-art" role="img" aria-label="Ilustração de flores delicadas e ramos de oliveira em um vaso, com convites de casamento"><div className="art-frame"/><img src={asset("/wedding-still-life.svg")} alt=""/><span className="art-caption">amor em cada detalhe</span><div className="hero-seal"><BrandMark/><small>20 · 08 · 28</small></div></div>
      </section>
      <section id="nossa-historia" className="love-note"><div className="note-mark"><Heart size={21} strokeWidth={1.2}/></div><p>O melhor presente é ter você com a gente.<br/><span>Mas, se quiser fazer parte dos nossos sonhos, preparamos esta lista com muito carinho.</span></p><Leaf className="note-leaf" size={50} strokeWidth={.8}/></section>
      <section id="presentes" className="catalog section-wrap">
        <div className="section-top"><div><p className="eyebrow">PEQUENOS CARINHOS, GRANDES MEMÓRIAS</p><h2>Nossa lista de <em>presentes</em></h2></div><span className="handwritten">um pedacinho dos nossos sonhos <Heart size={17}/></span></div>
        <p className="section-description">Da primeira xícara de café às aventuras da lua de mel. Escolha um carinho para fazer parte da nossa história.</p>
        {mode==='demo' && <div className="demo-notice"><Sparkles size={15}/><span>{preview?'Prévia local: nenhum pagamento ou dado é enviado aos noivos. As simulações são apagadas ao recarregar.':'Você está conhecendo uma demonstração. Nenhum pagamento real será realizado.'}</span></div>}
        {recentOrder&&<div className="resume-order"><span><GiftIcon size={15}/>{recentOrder.status==='pending'?'Você tem um presente em andamento.':'Seu último carinho está registrado.'}</span><button onClick={()=>{setSelected(null);setOrder(recentOrder);}}>Acompanhar meu presente <ArrowRight size={14}/></button></div>}
        {returnError && <div className="error-message" role="alert">{returnError}</div>}
        <div className="catalog-tools"><div className="category-tabs" role="group" aria-label="Categoria de presentes">{categories.map((c,i)=><button className={c===category?'selected':''} key={c} onClick={()=>setCategory(c)}>{i===0 && <GiftIcon size={15}/>} {c}</button>)}</div>
          <div className="search-sort"><label className="search-input"><Search size={17}/><input placeholder="Encontre um presente" aria-label="Buscar presentes" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="icon-button" aria-label="Limpar busca" onClick={()=>setSearch('')}><X size={14}/></button>}</label><label className="sort-select"><span className="sr-only">Ordenar presentes</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Mais especiais</option><option value="asc">Menor valor</option><option value="desc">Maior valor</option></select><ChevronDown size={14}/></label></div>
        </div>
        <div className="results-line"><span>{loading?'Preparando nossa lista…':`${visible.length} presentes escolhidos com carinho`}</span><span><ShieldCheck size={13}/> Um gesto de amor, com segurança</span></div>
        {error && <div className="error-message" role="alert">{error} <button onClick={()=>{setLoading(true);void load();}}>Tentar novamente</button></div>}
        {loading ? <div className="gift-grid">{Array.from({length:8},(_,i)=><div key={i} className="skeleton"/>)}</div> : <div className="gift-grid">{visible.map(g=><article className={`gift-card ${g.available?'':'unavailable'}`} key={g.id}>
          <button className="gift-image-button" onClick={()=>setSelected(g)} disabled={!g.available} aria-label={`Ver ${g.name}`}><img src={g.image_url} alt={g.name} loading="lazy"/><span className="gift-category">{g.category}</span><span className="gift-image-heart"><Heart size={17} strokeWidth={1.4}/></span></button>
          <div className="gift-info"><p className="gift-badge">{g.badge || 'Escolhido com carinho'}</p><h3>{g.name}</h3><p className="gift-description">{g.description}</p><div className="gift-bottom"><span className="gift-price">{money(g.price_cents)}</span><button className="gift-action" disabled={!g.available} onClick={()=>setSelected(g)}>{g.available?'Presentear':'Reservado'}{g.available?<ArrowRight size={15}/>:<Check size={14}/>}</button></div></div>
        </article>)}</div>}
        {!loading&&!error&&visible.length===0&&<div className="empty-state"><Search size={30}/><h3>Nenhum presente por aqui</h3><p>Tente outra palavra ou explore todas as categorias.</p><button className="button secondary" onClick={()=>{setSearch('');setCategory(categories[0]);}}>Ver todos os presentes</button></div>}
        <div className="catalog-end"><span/><Heart size={16}/><span/></div>
      </section>
      <section className="how-it-works"><div className="section-wrap"><p className="eyebrow">SIMPLES, COMO UM GESTO DE CARINHO</p><h2>Presentear é <em>fácil</em></h2><div className="steps"><div><span className="step-icon"><GiftIcon size={24} strokeWidth={1.2}/><small>01</small></span><h3>Escolha com o coração</h3><p>Encontre um presente que combine com<br/> os nossos sonhos e com você.</p></div><div><span className="step-icon"><Heart size={24} strokeWidth={1.2}/><small>02</small></span><h3>Deixe o seu carinho</h3><p>Conte quem está presenteando e, se quiser,<br/> escreva uma mensagem especial.</p></div><div><span className="step-icon"><ShieldCheck size={24} strokeWidth={1.2}/><small>03</small></span><h3>Presenteie com tranquilidade</h3><p>Escolha Pix ou cartão e acompanhe<br/> a confirmação do seu presente.</p></div></div></div></section>
      <section id="duvidas" className="faq-section section-wrap"><div className="faq-heading"><p className="eyebrow">PARA FICAR TUDO LEVE</p><h2>Alguma <em>dúvida?</em></h2><p>Separamos algumas respostas para<br/> ajudar você a escolher com tranquilidade.</p><img src={asset("/olive-sprig.svg")} alt=""/></div><div className="faq-list">{faqs.map(([q,a],i)=><div className={`faq-item ${faq===i?'expanded':''}`} key={q}><button aria-expanded={faq===i} aria-controls={`faq-${i}`} onClick={()=>setFaq(faq===i?null:i)}>{q}{faq===i?<Minus size={17}/>:<Plus size={17}/>}</button><div id={`faq-${i}`} hidden={faq!==i}><p>{a}</p></div></div>)}</div></section>
      <section className="closing"><BrandMark/><p>Que bom ter você na nossa história.</p><h2>Com todo o nosso amor,<br/><em>Maria Clara & Gabriel</em></h2><span>20 DE AGOSTO DE 2028</span></section>
    </main>
    <footer><span className="footer-brand"><BrandMark/><span className="footer-divider">|</span> Feito para celebrar o amor.</span><div><button onClick={()=>setPrivacy(true)}>Privacidade</button><a href={preview?"#painel":"/admin"} onClick={e=>{if(preview){e.preventDefault();setPreviewInfo(true);}}}><LockKeyhole size={12}/> Área dos noivos</a></div></footer>
    {(selected||order)&&<Checkout gift={selected} initialOrder={order} mode={mode} onClose={closeCheckout} onCatalogChange={()=>void load()} onOrderChange={setRecentOrder}/>}
    {previewInfo&&<Dialog title="Área privada dos noivos" onClose={()=>setPreviewInfo(false)}><p className="modal-description">O painel privado está disponível na versão completa do site. Esta prévia em arquivo permite conhecer o visual e experimentar os presentes, sem acessar o banco de dados ou receber pagamentos.</p></Dialog>}
    {privacy&&preview&&<Dialog title="Seus dados nesta prévia" onClose={()=>setPrivacy(false)}><p className="modal-description">Este arquivo não envia dados para a internet. Os campos servem apenas para experimentar o fluxo; nomes, e-mails e mensagens não são guardados pela prévia. As simulações são apagadas ao recarregar a página. O painel privado e os recebimentos dependem da versão completa do site.</p></Dialog>}
    {privacy&&!preview&&<Dialog title="Um cuidado com seus dados" onClose={()=>setPrivacy(false)}><p className="modal-description">Usamos seu nome, e-mail e mensagem apenas para identificar o presente, acompanhar o pagamento e permitir que Maria Clara e Gabriel saibam quem enviou o carinho.</p><p className="modal-description">Os dados são guardados no banco do site e acessíveis aos noivos em uma área privada. Dados de cartão são preenchidos exclusivamente no provedor de pagamento. Não usamos cookies de publicidade; a sessão administrativa usa um cookie necessário.</p><p className="modal-description">Antes de receber pagamentos reais, o casal deve informar aqui o responsável pelo tratamento, um contato para acesso ou exclusão dos dados e a política de retenção. Esta versão é uma demonstração.</p></Dialog>}
  </>;
}

export function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  const titleId = 'dialog-title';
  useEffect(()=>{
    const dialog=ref.current!;const previouslyFocused=document.activeElement as HTMLElement|null;
    dialog.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;previouslyFocused?.focus();};
  },[]);
  return <dialog ref={ref} className="dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="dialog-content"><button className="dialog-close icon-button" onClick={onClose} aria-label="Fechar janela"><X size={21}/></button><p className="eyebrow">MARIA CLARA & GABRIEL</p><h2 id={titleId}>{title}</h2>{children}</div></dialog>;
}

function Checkout({gift,initialOrder,mode,onClose,onCatalogChange,onOrderChange}:{gift:Gift|null;initialOrder:Order|null;mode:'demo'|'live';onClose:()=>void;onCatalogChange:()=>void;onOrderChange:(order:Order|null)=>void}) {
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
