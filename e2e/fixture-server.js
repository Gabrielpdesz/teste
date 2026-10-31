import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
const store=createStore();
const app=createApp({store,config:{mode:'demo',publicUrl:'http://127.0.0.1:3002',adminHash:hashPassword('somente-testes-e2e-2028')}});
const server=app.listen(3002,'127.0.0.1');
const stop=()=>server.close(()=>{store.close();process.exit(0);});
process.on('SIGTERM',stop);process.on('SIGINT',stop);
