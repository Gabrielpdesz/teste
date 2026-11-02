import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  const titleId = 'dialog-title';
  useEffect(()=>{
    const dialog=ref.current!;const previouslyFocused=document.activeElement as HTMLElement|null;
    dialog.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;previouslyFocused?.focus();};
  },[]);
  return <dialog ref={ref} className="dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="dialog-content"><button className="dialog-close icon-button" onClick={onClose} aria-label="Fechar janela"><X size={21}/></button><p className="eyebrow">MARIA CLARA & GABRIEL</p><h2 id={titleId}>{title}</h2>{children}</div></dialog>;
}
