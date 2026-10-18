import { Fragment } from 'react';

export interface BreadcrumbItem {
  label: string;
  /** si viene, el paso es un botón que vuelve ahí; el último no lo lleva */
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  /** de la sección al lugar actual: el último es donde está el usuario */
  items: BreadcrumbItem[];
}

/**
 * Migas: "Causas / 13284571 / Registrar acto procesal".
 *
 * Como el resto de `shared`, no sabe de rutas: cada paso avisa con `onClick`
 * y la pantalla decide a dónde navegar. El último paso es la pantalla actual,
 * así que se muestra como texto y lleva `aria-current`, aunque traiga
 * `onClick`: un link a donde ya estás no lleva a ningún lado.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="vz-crumbs" aria-label="Migas">
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
