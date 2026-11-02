import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Coffee, Gift as GiftIcon, House, LockKeyhole, Menu, Minus, Plane, Plus, Search, Sparkles, X } from 'lucide-react';
import { api, asset, isLocalPreview, money, tabStorage, type Gift, type Order } from './types';
import { BrandMark } from './BrandMark';
import { Checkout } from './Checkout';
import { Dialog } from './Dialog';

const categories = [
  {value:'Todos',label:'Todos os presentes',icon:GiftIcon},
  {value:'Nosso lar',label:'Para a nossa casa',icon:House},
  {value:'Lua de mel',label:'Lua de mel',icon:Plane},
  {value:'Carinhos',label:'Pequenos carinhos',icon:Coffee},
];

export function Wedding() {
  const [gifts,setGifts]=useState<Gift[]>([]);
  const [mode,setMode]=useState<'demo'|'live'>('demo');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [category,setCategory]=useState('Todos');
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState('featured');
  const [limit,setLimit]=useState(12);
  const [selected,setSelected]=useState<Gift|null>(null);
  const [order,setOrder]=useState<Order|null>(null);
  const [recentOrder,setRecentOrder]=useState<Order|null>(null);
  const [menu,setMenu]=useState(false);
  const [faq,setFaq]=useState<number|null>(null);
  const [privacy,setPrivacy]=useState(false);
  const [previewInfo,setPreviewInfo]=useState(false);
  const [returnError,setReturnError]=useState('');
  const preview=isLocalPreview();
  const load=()=>Promise.all([api<Gift[]>('/gifts'),api<{mode:'demo'|'live'}>('/config')])
    .then(([list,config])=>{setGifts(list);setMode(config.mode);setError('');})
    .catch(e=>setError(e.message)).finally(()=>setLoading(false));

  useEffect(()=>{void load();},[]);
  useEffect(()=>{setLimit(12);},[category,search]);
  useEffect(()=>{
    const id=tabStorage.getItem('lastOrder');const access=id&&tabStorage.getItem(`order:${id}`);
    if(id&&access)api<Order>(`/orders/${id}`,{headers:{Authorization:`Bearer ${access}`}})
      .then(o=>{if(o.status!=='cancelled')setRecentOrder(o);}).catch(()=>{});
  },[]);
  useEffect(()=>{
    const params=new URLSearchParams(location.search);const id=params.get('order');
    if(!id)return;
    const access=tabStorage.getItem(`order:${id}`);
    if(!access){setReturnError('Abra o acompanhamento no mesmo navegador em que iniciou seu presente.');return;}
    api<Order>(`/orders/${id}`,{headers:{Authorization:`Bearer ${access}`}}).then(setOrder).catch(e=>setReturnError(e.message));
    const nsu=params.get('transaction_nsu');const slug=params.get('slug')||params.get('invoice_slug');
    if(nsu&&slug)api<Order>(`/orders/${id}/verify`,{method:'POST',headers:{Authorization:`Bearer ${access}`},body:JSON.stringify({transaction_nsu:nsu,slug})})
      .then(setOrder).catch(e=>setReturnError(e.message));
  },[]);

  const visible=useMemo(()=>gifts.filter(g=>(category==='Todos'||g.category===category)&&`${g.name} ${g.description}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
    .sort((a,b)=>sort==='asc'?a.price_cents-b.price_cents:sort==='desc'?b.price_cents-a.price_cents:0),[gifts,category,search,sort]);
  const closeCheckout=()=>{setSelected(null);setOrder(null);void load();};
  const showCategory=(value:string)=>{setCategory(value);setSearch('');setMenu(false);};
  const featured=gifts.find(g=>g.id==='nao-dei-nada');
  const faqs=[
    ['Como presentear?','Escolha um presente, deixe seu nome e um recadinho. Não precisa criar uma conta.'],
    ['Os presentes são simbólicos?','Sim! Cada item representa uma contribuição para nossos planos. Os valores são sugestões, e as fotos dos produtos são ilustrativas.'],
    ['E o pagamento?',mode==='demo'?'Esta é uma demonstração: você pode experimentar o fluxo, mas nenhum valor é cobrado.':'O pagamento acontece no checkout seguro da InfinitePay. A confirmação aparece após a verificação do provedor.'],
  ];

  return <div className="wedding-v2">
    <header className="site-header">
      <a className="monogram" href="#inicio" aria-label="Maria Clara e Gabriel, início"><BrandMark/><span className="header-couple">MARIA CLARA <i>&</i> GABRIEL</span></a>
      <nav aria-label="Navegação principal" className={menu?'nav-open':''}>
        <a className="active" href="#presentes" onClick={()=>showCategory('Todos')}>Nossa lista</a>
        <a href="#duvidas" onClick={()=>setMenu(false)}>Como funciona</a>
      </nav>
      <button className="mobile-menu icon-button" aria-label={menu?'Fechar menu':'Abrir menu'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
    </header>

    <main>
      <section id="inicio" className="hero-v2 v2-container">
        <div className="hero-v2-copy">
          <h1>O começo de tudo.<br/><em>Com um toque seu.</em></h1>
          <p className="hero-v2-description">Faça parte da nossa vida a dois.</p>
          <a className="button primary" href="#presentes" onClick={()=>showCategory('Todos')}>Escolher um presente <ArrowDown size={16}/></a>
        </div>
        <div className="hero-v2-composition">
          <div className="composition-orbit"/>
          <button className="hero-meme" disabled={!featured?.available} onClick={()=>featured&&setSelected(featured)} aria-label="Ver presente Só pra não dizer que não dei nada">
            <img src={asset('/gifts/terry.jpg')} alt="Terry Crews com expressão séria" fetchPriority="high"/>
            <div><h2>Só pra não dizer<br/>que não dei nada.</h2><strong>{money(featured?.price_cents??5000)} <ArrowUpRight size={19}/></strong></div>
          </button>
          <div className="hero-keepsake" aria-label="Maria Clara e Gabriel, 20 de agosto de 2028">
            <span className="keepsake-caption">O NOSSO PARA SEMPRE</span>
            <BrandMark/>
            <span className="keepsake-names">Maria Clara <i>&</i> Gabriel</span>
            <span className="keepsake-date">20 DE AGOSTO DE 2028</span>
          </div>
          <span className="composition-spark"><Sparkles size={28} strokeWidth={1}/></span>
        </div>
      </section>

      <section id="presentes" className="catalog-v2 v2-container">
        <div className="catalog-v2-heading"><h2>Nossa lista de <em>presentes.</em></h2>{mode==='demo'&&<span className="demo-notice"><span/> Demonstração · sem cobranças</span>}</div>
        {recentOrder&&<div className="resume-order"><span><GiftIcon size={15}/>{recentOrder.status==='pending'?'Seu presente está em andamento.':'Seu último carinho está registrado.'}</span><button onClick={()=>{setSelected(null);setOrder(recentOrder);}}>Acompanhar meu presente <ArrowRight size={14}/></button></div>}
        {returnError&&<div className="error-message" role="alert">{returnError}</div>}
        <div className="catalog-v2-toolbar">
          <div className="category-tabs" role="group" aria-label="Categoria de presentes">{categories.map(({value,label,icon:Icon})=><button key={value} className={category===value?'selected':''} aria-pressed={category===value} onClick={()=>showCategory(value)}><Icon size={16}/>{label}</button>)}</div>
          <div className="search-sort"><label className="search-input"><Search size={18}/><input placeholder="O que combina com você?" aria-label="Buscar presentes" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="icon-button" aria-label="Limpar busca" onClick={()=>setSearch('')}><X size={14}/></button>}</label><label className="sort-select"><span className="sr-only">Ordenar presentes</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Nossa seleção</option><option value="asc">Menor valor</option><option value="desc">Maior valor</option></select><ChevronDown size={15}/></label></div>
        </div>
        <div className="results-line"><span>{loading?'Preparando a lista…':`${Math.min(limit,visible.length)} de ${visible.length} presentes`}</span><span>Contribuições simbólicas · valores sugeridos</span></div>
        {error&&<div className="error-message" role="alert">{error} <button onClick={()=>{setLoading(true);void load();}}>Tentar novamente</button></div>}
        {loading?<div className="gift-grid">{Array.from({length:8},(_,i)=><div className="skeleton" key={i}/>)}</div>:<div className="gift-grid">{visible.slice(0,limit).map(g=><article key={g.id} className={`gift-card ${g.available?'':'unavailable'}`} data-category={g.category}>
          <button className="gift-image-button" disabled={!g.available} onClick={()=>setSelected(g)} aria-label={`Ver ${g.name}`}><img src={g.image_url} alt={g.name} loading="lazy"/><span className="gift-image-heart"><ArrowUpRight size={19}/></span></button>
          <div className="gift-info"><h3>{g.name}</h3><div className="gift-bottom"><span className="gift-price">{money(g.price_cents)}</span><button className="gift-action" disabled={!g.available} onClick={()=>setSelected(g)}>{g.available?'Presentear':'Reservado'}{g.available?<ArrowRight size={14}/>:<Check size={14}/>}</button></div></div>
        </article>)}</div>}
        {!loading&&!error&&visible.length===0&&<div className="empty-state"><Search size={28}/><h3>Esse presente ainda não está na lista.</h3><button className="button secondary" onClick={()=>showCategory('Todos')}>Ver todos os presentes</button></div>}
        {visible.length>limit&&<button className="button secondary load-more" onClick={()=>setLimit(n=>n+12)}>Ver mais presentes <Plus size={17}/><span>{visible.length-limit}</span></button>}
      </section>

      <section id="duvidas" className="faq-v2 v2-container"><h2>Dúvidas <em>frequentes.</em></h2><div className="faq-list">{faqs.map(([q,a],i)=><div key={q} className={`faq-item ${faq===i?'expanded':''}`}><button aria-expanded={faq===i} aria-controls={`faq-${i}`} onClick={()=>setFaq(faq===i?null:i)}>{q}{faq===i?<Minus size={17}/>:<Plus size={17}/>}</button><div id={`faq-${i}`} hidden={faq!==i}><p>{a}</p></div></div>)}</div></section>
    </main>

    <footer className="footer-v2 v2-container"><div className="footer-couple"><BrandMark/></div><div><button onClick={()=>setPrivacy(true)}>Privacidade</button><a href={preview?'#painel':'/admin'} onClick={e=>{if(preview){e.preventDefault();setPreviewInfo(true);}}}><LockKeyhole size={12}/> Área dos noivos</a></div></footer>

    {(selected||order)&&<Checkout gift={selected} initialOrder={order} mode={mode} onClose={closeCheckout} onCatalogChange={()=>void load()} onOrderChange={setRecentOrder}/>}
    {previewInfo&&<Dialog title="Área privada dos noivos" onClose={()=>setPreviewInfo(false)}><p className="modal-description">O painel privado está disponível na versão completa do site. Esta demonstração permite conhecer a lista e experimentar os presentes, sem acessar o banco de dados ou receber pagamentos.</p></Dialog>}
    {privacy&&<Dialog title="Um cuidado com seus dados" onClose={()=>setPrivacy(false)}><p className="modal-description">{preview?'Nesta demonstração, nenhum dado é enviado aos noivos. Os campos servem apenas para experimentar o fluxo; as simulações são apagadas ao recarregar.':'Seu nome, e-mail e mensagem são usados para identificar o presente e ficam acessíveis aos noivos em uma área privada. Dados de cartão são preenchidos apenas no provedor.'}</p><p className="modal-description">Antes de receber contribuições reais, o site precisa informar o responsável pelo tratamento dos dados, um contato de privacidade e a política de retenção.</p></Dialog>}
  </div>;
}
