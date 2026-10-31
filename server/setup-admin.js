import { stdin, stdout } from 'node:process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { hashPassword } from './auth.js';

// Entrada sem eco em terminal; a senha nunca é impressa ou passada pela linha de comando.
if (!stdin.isTTY) throw new Error('Execute em um terminal interativo para definir sua senha com segurança.');
if (existsSync('.local/admin.env')) throw new Error('Acesso já configurado. Para trocar a senha, preserve/remova conscientemente .local/admin.env e execute novamente.');
stdout.write('Defina a senha administrativa (mínimo 12 caracteres): ');
const password = await new Promise((resolve,reject)=>{
  let value='';
  stdin.setRawMode(true); stdin.setEncoding('utf8'); stdin.resume();
  const finish=(error)=>{
    stdin.off('data',read); stdin.setRawMode(false); stdin.pause(); stdout.write('\n');
    if(error)reject(error);else resolve(value);
  };
  const read=(chunk)=>{
    for(const ch of chunk){
      if(ch==='\r'||ch==='\n'){finish();return;}
      if(ch==='\u0003'||ch==='\u0004'){finish(new Error('Configuração cancelada.'));return;}
      if(ch==='\u007f'||ch==='\b'){value=[...value].slice(0,-1).join('');continue;}
      if(ch>=' '&&ch!=='\u001b')value+=ch;
    }
  };
  stdin.on('data',read);
});
if (password.length < 12 || password.length > 256) throw new Error('Use entre 12 e 256 caracteres.');
mkdirSync('.local',{recursive:true,mode:0o700});
writeFileSync('.local/admin.env',`ADMIN_PASSWORD_HASH=${hashPassword(password)}\n`,{mode:0o600,flag:'wx'});
console.log('Acesso configurado. Reinicie o servidor e entre em /admin.');
