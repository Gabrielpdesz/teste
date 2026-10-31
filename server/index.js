import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { createStore } from './store.js';
import { createApp } from './app.js';
if (existsSync('.env')) loadEnvFile('.env');
if (existsSync('.local/admin.env') && !process.env.ADMIN_PASSWORD_HASH) loadEnvFile('.local/admin.env');
const store = createStore(process.env.DATABASE_PATH || '.local/wedding.sqlite');
const config = {mode:process.env.PAYMENTS_MODE || 'demo',adminHash:process.env.ADMIN_PASSWORD_HASH,
  production:process.env.NODE_ENV === 'production',publicUrl:process.env.PUBLIC_URL || 'http://localhost:3001',
  handle:process.env.INFINITEPAY_HANDLE,contractVerified:process.env.INFINITEPAY_CONTRACT_VERIFIED === 'true'};
const server = createApp({store,config}).listen(Number(process.env.PORT || 3001),'0.0.0.0',() => {
  console.log(`Maria Clara & Gabriel: servidor iniciado; pagamentos em modo ${config.mode}.`);
});
const stop = () => server.close(() => {store.close();process.exit(0);});
process.on('SIGTERM',stop); process.on('SIGINT',stop);
