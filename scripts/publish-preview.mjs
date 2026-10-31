import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

// Publish only the prepared public demo. Never switch/reset the source checkout.
// No force push: a concurrent remote change fails instead of being overwritten.
const git=(args,input)=>execFileSync('git',args,{encoding:'utf8',...(input!==undefined?{input}:{})}).trim();
const remote=git(['remote','get-url','origin']);
const url=new URL(remote);
if(url.hostname!=='github.com'||url.pathname.replace(/\.git$/,'').toLowerCase()!=='/gabrielpdesz/teste'){
  throw new Error('Confirme o repositório de destino antes de publicar.');
}
const html=await readFile('site-preview/index.html','utf8');
if(!html.includes('window.__WEDDING_PREVIEW_ASSETS__='))throw new Error('Prévia independente ausente.');
const current=git(['ls-remote','origin','refs/heads/gh-pages']);
const parent=current?current.split(/\s/)[0]:null;
if(parent)git(['fetch','--no-tags','origin','refs/heads/gh-pages']);
const index=git(['hash-object','-w','--stdin'],html);
const empty=git(['hash-object','-w','--stdin'],'');
const tree=git(['mktree'],`100644 blob ${empty}\t.nojekyll\n100644 blob ${index}\tindex.html\n`);
if(parent&&git(['rev-parse',`${parent}^{tree}`])===tree){
  console.log('A branch gh-pages já contém esta versão da demonstração.');
}else{
  const commit=git(['commit-tree',tree,...(parent?['-p',parent]:[]),'-m','Publish wedding gift-list demonstration']);
  execFileSync('git',['push','origin',`${commit}:refs/heads/gh-pages`],{stdio:'inherit'});
  console.log(`Demonstração enviada à branch gh-pages (${commit.slice(0,12)}).`);
}
console.log('A publicação pública depende de GitHub Pages habilitado para gh-pages, pasta / (root).');
