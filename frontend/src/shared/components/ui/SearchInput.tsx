import type { InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

/** Buscador de la barra superior. No busca: avisa con onChange. */
export function SearchInput({
  className = '', ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`vz-search ${className}`}>
      <Icon nombre="buscar" tamano={16} className="vz-search__icon" />
      <input type="search" className="vz-search__input" {...rest} />
    </div>
  );
}
