import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { checkPassword } from './auth.js';
import { digest, token, StoreError } from './store.js';
import { infinitePay } from './payments.js';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const orderSchema = z.object({ giftId: z.string().min(1).max(80), name: z.string().trim().min(2).max(120),
  email: z.email().max(254), message: z.string().trim().max(800).default(''), method: z.enum(['pix','card']) }).strict();
const identifiers = z.object({ transaction_nsu: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
  slug: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/) });
const giftSchema = z.object({ name: z.string().trim().min(3).max(100), description: z.string().trim().min(5).max(600),
  price_cents: z.number().int().min(100).max(100000000), category: z.enum(['Carinhos','Nosso lar','Experiências','Lua de mel']),
  image_url: z.string().regex(/^\/gifts\/[a-z-]+\.svg$/), badge: z.string().trim().max(45), active: z.boolean() });

export function createApp({ store, config, provider }) {
  const app = express();
  const live = config.mode === 'live';
  if (!['demo','live'].includes(config.mode)) throw new Error('PAYMENTS_MODE deve ser demo ou live.');
  if (config.production && !config.adminHash) throw new Error('Configure ADMIN_PASSWORD_HASH antes de iniciar em produção.');
  if (live && (!config.contractVerified || !config.handle || !config.publicUrl?.startsWith('https://'))) {
    throw new Error('Pagamentos reais bloqueados: valide o contrato oficial, configure InfiniteTag e PUBLIC_URL HTTPS.');
  }
  const payments = provider || (live ? infinitePay({handle:config.handle,publicUrl:config.publicUrl}) : null);
  app.disable('x-powered-by');
  app.use(helmet({ strictTransportSecurity: config.production ? undefined : false,
    contentSecurityPolicy: { directives: { 'img-src': ["'self'",'data:'], 'upgrade-insecure-requests': config.production ? [] : null } } }));
  app.use(express.json({ limit: '12kb' }));
  app.use('/api', (_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  app.use('/api', (req,res,next) => {
    if (['GET','HEAD','OPTIONS'].includes(req.method) || req.path.startsWith('/webhooks/')) return next();
    const allowed = config.production || live ? [config.publicUrl] : ['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3001','http://127.0.0.1:3001',config.publicUrl];
    if (!req.headers.origin || !allowed.includes(req.headers.origin)) return res.status(403).json({error:'Origem da solicitação não autorizada.'});
    next();
  });
  const asyncRoute = (fn) => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
  const guest = (req,res,next) => {
    const order = store.order(req.params.id);
    const bearer = req.headers.authorization?.replace(/^Bearer /,'');
    if (!order || !bearer || digest(bearer) !== order.access_hash) return res.status(404).json({error:'Pedido não encontrado ou acesso inválido.'});
    req.order = order; next();
  };
  const publicOrder = (o) => ({ id:o.id,gift_name:o.gift_name,amount_cents:o.amount_cents,method:o.method,
    mode:o.mode,status:o.status,checkout_url:o.checkout_url,created_at:o.created_at });
  app.get('/api/config', (_req,res) => res.json({ mode: config.mode, adminConfigured: !!config.adminHash }));
  app.get('/api/gifts', (_req,res) => res.json(store.catalog(config.mode)));
  const orderLimit = rateLimit({ windowMs: 15*60*1000, limit: 25, standardHeaders:'draft-8', legacyHeaders:false,
    message: {error:'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'} });
  app.post('/api/orders',orderLimit,asyncRoute(async (req,res) => {
    const data = orderSchema.parse(req.body);
    const key = z.string().uuid().parse(req.headers['idempotency-key']);
    const access = z.string().regex(/^[a-f0-9]{64}$/).parse(req.headers['x-order-token']);
    const hook = token();
    const result = store.reserve(data,config.mode,key,access,hook);
    let order = result.order;
    if (live && !result.repeated) {
      try {
        const url = await payments.checkout(order,hook);
        store.setCheckout(order.id,url); order = store.order(order.id);
      } catch {
        // Uma resposta incerta não libera a reserva: o provedor pode ter criado o checkout.
        // Devolver a referência permite que o convidado acompanhe o pedido com seu token.
        return res.status(201).json(publicOrder(order));
      }
    }
    res.status(result.repeated ? 200 : 201).json(publicOrder(order));
  }));
  app.get('/api/orders/:id',guest,(req,res) => res.json(publicOrder(req.order)));
  app.post('/api/orders/:id/demo-confirm',guest,(req,res) => {
    if (config.mode !== 'demo') throw new StoreError('Simulação desativada.',404);
    res.json(publicOrder(store.demoConfirm(req.order.id)));
  });
  app.post('/api/orders/:id/cancel',guest,(req,res) => {
    if (req.order.mode !== 'demo') throw new StoreError('Um checkout real precisa ser conferido com o provedor antes de liberar a reserva.',409);
    store.cancelDemo(req.order.id); res.json({ok:true});
  });
  app.post('/api/orders/:id/verify',orderLimit,guest,asyncRoute(async(req,res) => {
    if (!live) return res.json(publicOrder(req.order));
    if (req.order.status === 'confirmed') return res.json(publicOrder(req.order));
    const ids = identifiers.parse(req.body);
    const payment = await payments.verify(req.order,ids);
    res.json(publicOrder(store.confirm(req.order.id,payment)));
  }));
  app.post('/api/webhooks/infinitepay/:id/:capability',orderLimit,asyncRoute(async(req,res) => {
    const order = store.order(req.params.id);
    if (!live || !order || digest(req.params.capability) !== order.hook_hash) throw new StoreError('Notificação inválida.',404);
    if (order.status === 'confirmed') return res.json({ok:true});
    if (req.body.order_nsu !== order.id) throw new StoreError('Pedido divergente.',422);
    const ids = identifiers.parse({transaction_nsu:req.body.transaction_nsu,slug:req.body.invoice_slug});
    const payment = await payments.verify(order,ids);
    store.confirm(order.id,payment); res.json({ok:true});
  }));
  const authLimit = rateLimit({windowMs:15*60*1000,limit:8,skipSuccessfulRequests:true,standardHeaders:'draft-8',legacyHeaders:false,
    message:{error:'Muitas tentativas de acesso. Aguarde 15 minutos.'}});
  const cookieOptions = {httpOnly:true,secure:!!config.production||live,sameSite:'strict',path:'/api/admin',maxAge:8*60*60*1000};
  const admin = (req,res,next) => {
    const value = req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('wedding_session='))?.slice('wedding_session='.length);
    const session = value && store.db.prepare('SELECT * FROM sessions WHERE hash=? AND expires_at>?').get(digest(value),Date.now());
    if (!session) return res.status(401).json({error:'Entre para acessar o painel.'});
    req.sessionHash = digest(value); next();
  };
  app.post('/api/admin/login',authLimit,(req,res) => {
    if (!config.adminHash) throw new StoreError('O acesso administrativo ainda não foi configurado. Execute npm run admin:setup no servidor.',503);
    if (!checkPassword(req.body?.password,config.adminHash)) throw new StoreError('Senha incorreta.',401);
    const session = token();
    store.db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
    store.db.prepare('INSERT INTO sessions VALUES (?,?)').run(digest(session),Date.now()+8*60*60*1000);
    res.cookie('wedding_session',session,cookieOptions).json({ok:true});
  });
  app.get('/api/admin/dashboard',admin,(_req,res) => res.json(store.admin()));
  app.post('/api/admin/logout',admin,(req,res) => {
    store.db.prepare('DELETE FROM sessions WHERE hash=?').run(req.sessionHash);
    res.clearCookie('wedding_session',{...cookieOptions,maxAge:undefined}).json({ok:true});
  });
  app.post('/api/admin/gifts',admin,(req,res) => res.status(201).json(store.saveGift(null,giftSchema.parse(req.body))));
  app.put('/api/admin/gifts/:id',admin,(req,res) => res.json(store.saveGift(req.params.id,giftSchema.parse(req.body))));
  app.post('/api/admin/reset-demo',admin,(_req,res) => {store.resetDemo();res.json({ok:true});});
  app.use('/api',(_req,res) => res.status(404).json({error:'Rota não encontrada.'}));
  const dist = resolve('dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}',(_req,res) => res.sendFile(resolve(dist,'index.html')));
  }
  app.use((error,_req,res,_next) => {
    if (error instanceof z.ZodError) return res.status(400).json({error:'Revise os dados informados e tente novamente.'});
    const status = error.status || 500;
    if (status === 500) console.error('Falha interna:', error.code || error.name);
    res.status(status).json({error:status === 500 ? 'Não foi possível concluir agora. Tente novamente em instantes.' : error.message});
  });
  return app;
}
