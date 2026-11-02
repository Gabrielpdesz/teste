import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createStore, token } from './store.js';
import { createApp } from './app.js';
import { hashPassword } from './auth.js';
import { infinitePay } from './payments.js';
import { initialGifts } from './catalog.js';
import legacyGifts from './legacy-catalog.json' with {type:'json'};

const origin='http://localhost:3001';
const draft={giftId:'cafe',name:'Convidado de Teste',email:'teste@example.com',message:'Felicidades!',method:'pix'};
async function fixture(t,{mode='demo',provider}={}) {
  const store=createStore();
  const config={mode,adminHash:hashPassword('senha-de-teste-segura'),publicUrl:mode==='live'?'https://casamento.example':origin,handle:'casal',contractVerified:true};
  const app=createApp({store,config,provider});
  const server=app.listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  t.after(async()=>{await new Promise(r=>server.close(r));store.close();});
  const url=`http://127.0.0.1:${server.address().port}`;
  const request=async(path,{method='GET',body,headers={}}={})=>fetch(url+path,{method,
    headers:{Origin:config.publicUrl,...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const reserve=async(data=draft,access=token(),key=randomUUID())=>{
    const headers={'Idempotency-Key':key,'X-Order-Token':access};
    const response=await request('/api/orders',{method:'POST',headers,body:data});
    return {response,data:await response.json(),access,key};
  };
  return {store,request,reserve};
}

test('catálogo usa reais em centavos e não expõe dados dos convidados',async t=>{
  const {request}=await fixture(t);
  const response=await request('/api/gifts');assert.equal(response.status,200);
  const gifts=await response.json();assert.equal(gifts.length,initialGifts.length);assert.equal(gifts.find(g=>g.id==='cafe').price_cents,7500);
  assert.ok(gifts.some(g=>g.id==='aspirador'&&g.category==='Nosso lar'));assert.ok(gifts.some(g=>g.category==='Memes'));
  assert.equal(gifts[0].available,1);assert.equal(gifts[0].email,undefined);
});

test('duas reservas concorrentes resultam em apenas um vencedor',async t=>{
  const {reserve,store}=await fixture(t);
  const results=await Promise.all([reserve(),reserve()]);
  assert.deepEqual(results.map(r=>r.response.status).sort(),[201,409]);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});

test('idempotência preserva o pedido e rejeita mudança de titular ou conteúdo',async t=>{
  const {reserve}=await fixture(t);const access=token(),key=randomUUID();
  const first=await reserve(draft,access,key);const second=await reserve(draft,access,key);
  assert.equal(first.response.status,201);assert.equal(second.response.status,200);assert.equal(first.data.id,second.data.id);
  const changed=await reserve({...draft,name:'Outro'},access,key);assert.equal(changed.response.status,409);
  const stolen=await reserve(draft,token(),key);assert.equal(stolen.response.status,409);
});

test('o navegador não pode alterar o preço e pedidos exigem token privado',async t=>{
  const {reserve,request}=await fixture(t);
  assert.equal((await reserve({...draft,amount_cents:1})).response.status,400);
  const order=await reserve();assert.equal(order.data.amount_cents,7500);
  assert.equal((await request(`/api/orders/${order.data.id}`)).status,404);
  assert.equal((await request(`/api/orders/${order.data.id}`,{headers:{Authorization:`Bearer ${order.access}`}})).status,200);
});

test('simular pagamento é idempotente e não soma receita real',async t=>{
  const {reserve,request,store}=await fixture(t);const order=await reserve();
  const path=`/api/orders/${order.data.id}/demo-confirm`;const headers={Authorization:`Bearer ${order.access}`};
  assert.equal((await request(path,{method:'POST',headers})).status,200);
  assert.equal((await request(path,{method:'POST',headers})).status,200);
  assert.equal(store.admin().totals.received,0);assert.equal(store.admin().totals.confirmed,0);assert.equal(store.admin().totals.simulations,1);
});

test('painel privado exige sessão, senha correta e origem permitida',async t=>{
  const {request}=await fixture(t);
  assert.equal((await request('/api/admin/dashboard')).status,401);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'incorreta'}})).status,401);
  assert.equal((await request('/api/admin/login',{method:'POST',headers:{Origin:'https://malicioso.example'},body:{password:'senha-de-teste-segura'}})).status,403);
  const login=await request('/api/admin/login',{method:'POST',body:{password:'senha-de-teste-segura'}});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
  const headers={Cookie:cookie.split(';')[0]};
  assert.equal((await request('/api/admin/dashboard',{headers})).status,200);
  assert.equal((await request('/api/admin/logout',{method:'POST',headers})).status,200);
  assert.equal((await request('/api/admin/dashboard',{headers})).status,401);
});

test('edição do catálogo mantém valor histórico de reservas e permite ocultar itens',async t=>{
  const {request,reserve,store}=await fixture(t);const reserved=await reserve();
  const login=await request('/api/admin/login',{method:'POST',body:{password:'senha-de-teste-segura'}});
  const gift=store.catalog('demo').find(g=>g.id==='cafe');const payload={name:gift.name,description:gift.description,price_cents:15000,category:gift.category,image_url:gift.image_url,badge:gift.badge,active:false};
  const res=await request('/api/admin/gifts/cafe',{method:'PUT',headers:{Cookie:login.headers.get('set-cookie').split(';')[0]},body:payload});
  assert.equal(res.status,200);assert.equal(store.order(reserved.data.id).amount_cents,7500);
  assert.equal(store.catalog('demo').some(g=>g.id==='cafe'),false);
});

test('logins corretos não consomem o limite de tentativas inválidas',async t=>{
  const {request}=await fixture(t);
  for (let i=0;i<10;i++) assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'senha-de-teste-segura'}})).status,200);
  for (let i=0;i<8;i++) assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'incorreta'}})).status,401);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'incorreta'}})).status,429);
});

test('pagamentos reais falham fechados sem contrato validado e HTTPS',()=>{
  const store=createStore();
  assert.throws(()=>createApp({store,config:{mode:'live',handle:'casal',publicUrl:origin}}),/bloqueados/);
  assert.throws(()=>createApp({store,config:{mode:'demo',production:true}}),/ADMIN_PASSWORD_HASH/);store.close();
});

test('webhook consulta provedor; valor divergente não confirma; replay não duplica receita',async t=>{
  let hook;let valid=false;let calls=0;
  const provider={checkout:async(_o,h)=>{hook=h;return 'https://checkout.infinitepay.io/casal';},
    verify:async(o,ids)=>{calls++;return {success:true,paid:true,amount:valid?o.amount_cents:1,...ids,capture_method:'pix'};}};
  const {reserve,request,store}=await fixture(t,{mode:'live',provider});const order=await reserve();
  assert.equal((await request(`/api/orders/${order.data.id}/demo-confirm`,{method:'POST',headers:{Authorization:`Bearer ${order.access}`}})).status,404);
  const path=`/api/webhooks/infinitepay/${order.data.id}/${hook}`;
  const body={order_nsu:order.data.id,invoice_slug:'invoice-test',transaction_nsu:'transaction-test'};
  assert.equal((await request(path+'wrong',{method:'POST',body})).status,404);
  assert.equal((await request(path,{method:'POST',body})).status,422);assert.equal(store.order(order.data.id).status,'pending');
  valid=true;assert.equal((await request(path,{method:'POST',body})).status,200);
  assert.equal((await request(path,{method:'POST',body})).status,200);
  assert.equal(calls,2);assert.equal(store.admin().totals.received,7500);assert.equal(store.admin().totals.confirmed,1);
});

test('transação do provedor não pode ser reutilizada para dois presentes',()=>{
  const store=createStore();
  const a=store.reserve(draft,'live',randomUUID(),token(),token()).order;
  const b=store.reserve({...draft,giftId:'netflix'},'live',randomUUID(),token(),token()).order;
  store.confirm(a.id,{success:true,paid:true,amount:7500,transaction_nsu:'mesma',slug:'s1'});
  assert.throws(()=>store.confirm(b.id,{success:true,paid:true,amount:15000,transaction_nsu:'mesma',slug:'s2'}));
  assert.equal(store.order(b.id).status,'pending');assert.equal(store.admin().totals.received,7500);store.close();
});

test('falha incerta no checkout preserva reserva e devolve referência recuperável',async t=>{
  const provider={checkout:async()=>{throw new Error('tempo esgotado');}};
  const {reserve,request,store}=await fixture(t,{mode:'live',provider});
  const attempt=await reserve();assert.equal(attempt.response.status,201);assert.ok(attempt.data.id);
  assert.equal(attempt.data.checkout_url,null);assert.equal(store.order(attempt.data.id).status,'pending');
  const get=await request(`/api/orders/${attempt.data.id}`,{headers:{Authorization:`Bearer ${attempt.access}`}});assert.equal(get.status,200);
});

test('adaptador rejeita URL de checkout externa e transação divergente',async()=>{
  const provider=infinitePay({handle:'casal',publicUrl:'https://casamento.example',fetchImpl:async()=>({ok:true,json:async()=>({url:'https://phishing.example/cobrar'})})});
  await assert.rejects(()=>provider.checkout({id:'a',amount_cents:100,gift_name:'Presente',guest_name:'Pessoa',email:'a@b.com'},token()),/não pertence/);
  const wrong=infinitePay({handle:'casal',publicUrl:'https://casamento.example',fetchImpl:async()=>({ok:true,json:async()=>({order_nsu:'outro',paid:true,amount:100})})});
  await assert.rejects(()=>wrong.verify({id:'pedido'},{transaction_nsu:'t',slug:'s'}),/não corresponde/);
});

test('persistência sobrevive à reabertura do banco',async t=>{
  const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');
  const folder=mkdtempSync(`${tmpdir()}/wedding-test-`);t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const first=createStore(`${folder}/db.sqlite`);const reserved=first.reserve(draft,'demo',randomUUID(),token(),token());first.demoConfirm(reserved.order.id);first.close();
  const second=createStore(`${folder}/db.sqlite`);assert.equal(second.order(reserved.order.id).status,'demo_confirmed');assert.equal(second.catalog('demo').find(g=>g.id==='cafe').available,0);second.close();
});

test('novo catálogo preserva edições do casal e pedidos anteriores na migração',async t=>{
  const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');
  const folder=mkdtempSync(`${tmpdir()}/wedding-migration-`);t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const first=createStore(`${folder}/db.sqlite`);
  first.db.exec('DELETE FROM gifts; DELETE FROM schema_migrations;');
  const insert=first.db.prepare('INSERT INTO gifts (id,name,description,price_cents,category,image_url,badge,active,sort_order) VALUES (?,?,?,?,?,?,?,?,?)');
  for(const gift of legacyGifts)insert.run(...Object.values(gift));
  first.db.prepare('UPDATE gifts SET name=?,price_cents=? WHERE id=?').run('Café escolhido pelo casal',9900,'cafe');
  const reserved=first.reserve({...draft,giftId:'buffet'},'demo',randomUUID(),token(),token()).order;
  first.close();
  const upgraded=createStore(`${folder}/db.sqlite`);
  assert.equal(upgraded.catalog('demo').find(g=>g.id==='cafe').name,'Café escolhido pelo casal');
  assert.equal(upgraded.catalog('demo').find(g=>g.id==='cafe').price_cents,9900);
  assert.ok(upgraded.catalog('demo').some(g=>g.id==='aspirador'));
  assert.equal(upgraded.order(reserved.id).gift_name,'Passe VIP para repetir o buffet');
  assert.equal(upgraded.order(reserved.id).amount_cents,10000);
  const count=upgraded.catalog('demo').length;upgraded.close();
  const reopened=createStore(`${folder}/db.sqlite`);assert.equal(reopened.catalog('demo').length,count);reopened.close();
});
