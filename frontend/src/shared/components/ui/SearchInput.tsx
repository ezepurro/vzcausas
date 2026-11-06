import type { InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

/**
 * Tope de lo que se escribe en un buscador. V5 no lo fija, pero el backend
 * rechaza con `400` un `search` muy largo (decisión del equipo, 06/11/2026).
 */
export const SEARCH_MAX_LENGTH = 100;

/** Buscador de la barra superior. No busca: avisa con onChange. */
export function SearchInput({
  className = '', maxLength = SEARCH_MAX_LENGTH, ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`vz-search ${className}`}>
      <Icon name="search" size={16} className="vz-search__icon" />
      <input type="search" className="vz-search__input" maxLength={maxLength} {...rest} />
    </div>
  );
}
