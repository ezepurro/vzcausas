import { Fragment } from 'react';
import { Icon } from './Icon';

export interface BreadcrumbItem {
  label: string;
  /** si viene, el paso es un botón que vuelve ahí; el último no lo lleva */
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  /** de la sección al lugar actual: el último es donde está el usuario */
  items: BreadcrumbItem[];
  /** si viene, una flecha antes de las migas vuelve a la pantalla anterior */
  onBack?: () => void;
}

/**
 * Migas: "Causas / 13284571 / Registrar acto procesal".
 *
 * Como el resto de `shared`, no sabe de rutas: cada paso avisa con `onClick`
 * y la pantalla decide a dónde navegar. El último paso es la pantalla actual,
 * así que se muestra como texto y lleva `aria-current`, aunque traiga
 * `onClick`: un link a donde ya estás no lleva a ningún lado.
 *
 * La flecha (`onBack`) no es un paso más: las migas llevan siempre a la
 * sección, y la flecha a donde estaba el usuario, que puede ser otra (entrar
 * a una causa desde Inicio y volver a Inicio).
 */
export function Breadcrumbs({ items, onBack }: BreadcrumbsProps) {
  return (
    <nav className="vz-crumbs" aria-label="Migas">
      {onBack && (
        <button type="button" className="vz-crumbs__back" onClick={onBack} aria-label="Volver" title="Volver">
          <Icon name="back" size={15} />
        </button>
      )}
      {items.map((item, i) => {
        const current = i === items.length - 1;

        return (
          <Fragment key={`${i}-${item.label}`}>
            {i > 0 && <span className="vz-crumbs__sep" aria-hidden="true">/</span>}
            {current || !item.onClick ? (
              <span
                className={current ? 'vz-crumbs__current' : 'vz-crumbs__step'}
                aria-current={current ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <button type="button" className="vz-crumbs__link" onClick={item.onClick}>
                {item.label}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
