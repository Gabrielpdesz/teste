export type Gift = { id:string; name:string; description:string; price_cents:number; category:string; image_url:string; badge:string; active:number; available:number; };
export type Order = { id:string; gift_name:string; amount_cents:number; method:'pix'|'card'; mode:'demo'|'live'; status:string; checkout_url:string|null; created_at:string; };
export type AdminOrder = Order & {guest_name:string; email:string; message:string; confirmed_at:string|null;};
export type Dashboard = { gifts:Gift[]; orders:AdminOrder[]; totals:{received:number;confirmed:number;pending:number;simulations:number} };
export const money = (cents:number) => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
declare global { interface Window { __WEDDING_PREVIEW_ASSETS__?:Record<string,string>; } }
export const isLocalPreview = () => Boolean(window.__WEDDING_PREVIEW_ASSETS__);
export const asset = (path:string) => window.__WEDDING_PREVIEW_ASSETS__?.[path] || path;
const memoryStorage = new Map<string,string>();
export const tabStorage = {
  getItem(key:string) { try{return sessionStorage.getItem(key);}catch{return memoryStorage.get(key)??null;} },
  setItem(key:string,value:string) { try{sessionStorage.setItem(key,value);}catch{memoryStorage.set(key,value);} },
  removeItem(key:string) { try{sessionStorage.removeItem(key);}catch{memoryStorage.delete(key);} },
};
export async function api<T>(path:string, options:RequestInit = {}):Promise<T> {
  const res = await fetch(`/api${path}`,{...options,headers:{...(options.body ? {'Content-Type':'application/json'} : {}),...options.headers}});
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  return data as T;
}
