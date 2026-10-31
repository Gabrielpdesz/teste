import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const result=await build({
  configFile:false,plugins:[react()],logLevel:'warn',
  define:{'process.env.NODE_ENV':JSON.stringify('production')},
  build:{write:false,lib:{entry:resolve('scripts/preview-entry.jsx'),name:'WeddingPreview',formats:['iife']},minify:'esbuild'},
});
const outputs=(Array.isArray(result)?result:[result]).flatMap(r=>r.output);
const js=outputs.filter(o=>o.type==='chunk').map(o=>o.code).join('\n');
const css=outputs.filter(o=>o.type==='asset'&&o.fileName.endsWith('.css')).map(o=>o.source.toString()).join('\n');
if(!js||!css)throw new Error('A prévia não gerou JavaScript ou estilos.');
const assets={};
const files=['wedding-logo.png','olive-sprig.svg','wedding-still-life.svg',...(await readdir('public/gifts')).filter(n=>n.endsWith('.svg')).map(n=>`gifts/${n}`)];
for(const file of files){
  const mime=file.endsWith('.png')?'image/png':'image/svg+xml';
  assets[`/${file}`]=`data:${mime};base64,${(await readFile(`public/${file}`)).toString('base64')}`;
}
const script=`window.__WEDDING_PREVIEW_ASSETS__=${JSON.stringify(assets)};\n${js}`.replace(/<\/script/gi,'<\\/script');
let html=await readFile('src/index.html','utf8');
html=html.replace('<head>','<head>\n<!-- Prévia gerada por npm run build:preview. Fonte da aplicação completa: src/index.html. -->\n<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">');
html=html.replace('href="/wedding-logo.png"',`href="${assets['/wedding-logo.png']}"`);
html=html.replace('<script type="module" src="./main.tsx"></script>',()=>`<style>${css}</style><script>${script}</script>`);
await writeFile('index.html',html);
console.log('index.html independente gerado: imagens, fontes, estilos e demonstração incluídos no arquivo.');
