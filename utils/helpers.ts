import { Rental } from '../types';

export const loadScript = (src: string) => {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar script ${src}`));
    document.head.appendChild(script);
  });
};

export const formatBRL = (value: number | undefined) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const getSortValue = (rental: Rental, column: string) => {
  switch (column) {
    case 'refNumber':
      const num = parseFloat(rental.refNumber);
      return isNaN(num) ? rental.refNumber : num;
    case 'owner':
      return rental.owner;
    case 'tenantName':
      return rental.tenantName;
    default:
      return '';
  }
};