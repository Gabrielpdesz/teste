import { asset } from './types';

export function BrandMark({ className = '' }: { className?: string }) {
  return <img className={`brand-mark ${className}`} src={asset('/wedding-mark.webp')}
    alt="Monograma MG de Maria Clara e Gabriel, em verde oliva e dourado" />;
}
