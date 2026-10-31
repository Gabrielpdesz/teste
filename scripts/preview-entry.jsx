import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../src/App.tsx';
import { initialGifts } from '../server/catalog.js';
import '../src/fonts.css';
import '../src/styles.css';
import '../src/resume.css';
import '../src/refinements.css';
import '../src/brand.css';

// This entry is bundled only into the downloadable preview, never the server app.
// No HTTP API, payments, guest information or admin credentials are contacted.
const gifts = initialGifts.map(g => ({...g,image_url:window.__WEDDING_PREVIEW_ASSETS__[g.image_url]}));
const orders = new Map();
const requests = new Map();
if(!crypto.randomUUID) crypto.randomUUID = () => {
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
window.fetch=async(input,options={})=>{
  const path=typeof input==='string'?input:input.url;
  const headers=new Headers(options.headers);
  if(path==='/api/config')return response({mode:'demo',adminConfigured:false});
  if(path==='/api/gifts')return response(gifts.map(g=>({...g,available:[...orders.values()].some(o=>o.giftId===g.id&&o.status!=='cancelled')?0:1})));
  if(path==='/api/orders'&&options.method==='POST'){
    const data=JSON.parse(options.body);const key=headers.get('Idempotency-Key');const access=headers.get('X-Order-Token');
    if(!key||!access)return response({error:'Reabra o presente para continuar a demonstração.'},400);
    if(requests.has(key))return response(orders.get(requests.get(key)));
    const gift=gifts.find(g=>g.id===data.giftId);
    if(!gift)return response({error:'Presente não encontrado nesta prévia.'},404);
    if([...orders.values()].some(o=>o.giftId===gift.id&&o.status!=='cancelled'))return response({error:'Presente reservado nesta demonstração. Escolha outro.'},409);
    const order={id:crypto.randomUUID(),giftId:gift.id,gift_name:gift.name,amount_cents:gift.price_cents,
      method:data.method==='card'?'card':'pix',mode:'demo',status:'pending',checkout_url:null,created_at:new Date().toISOString(),access};
    // Guest names, emails and messages are intentionally not retained by this preview.
    orders.set(order.id,order);requests.set(key,order.id);return response(order,201);
  }
  const match=path.match(/^\/api\/orders\/([^/]+)(?:\/(demo-confirm|cancel))?$/);
  if(match){
    const order=orders.get(match[1]);
    if(!order||headers.get('Authorization')!==`Bearer ${order.access}`)return response({error:'Esta demonstração foi reiniciada. Escolha um presente para experimentar novamente.'},404);
    if(match[2]==='demo-confirm'&&options.method==='POST')order.status='demo_confirmed';
    if(match[2]==='cancel'&&options.method==='POST')order.status='cancelled';
    return response(order);
  }
  return response({error:'Esta função está disponível na versão completa, iniciada pelo servidor.'},503);
};
createRoot(document.getElementById('root')).render(<App/>);
