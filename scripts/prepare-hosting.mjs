import { mkdir, readFile, writeFile } from 'node:fs/promises';
const html=await readFile('index.html','utf8');
if(!html.includes('window.__WEDDING_PREVIEW_ASSETS__='))throw new Error('Execute npm run build:preview antes de preparar a hospedagem.');
await mkdir('site-preview',{recursive:true});
await writeFile('site-preview/index.html',html);
await writeFile('site-preview/.nojekyll','');
console.log('Demonstração estática preparada em site-preview/. Nenhum banco ou credencial incluído.');
