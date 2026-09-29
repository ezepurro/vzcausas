import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** antetítulo en mayúsculas: el grupo del rail al que pertenece la pantalla */
  eyebrow?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, sub, actions }: PageHeaderProps) {
  return (
    <header className="vz-page-head">
      <div>
        {eyebrow && <div className="vz-eyebrow">{eyebrow}</div>}
        <h1 className="vz-page-head__title">{title}</h1>
        {sub && <p className="vz-page-head__sub">{sub}</p>}
      </div>
      {actions && <div className="vz-page-head__actions">{actions}</div>}
    </header>
  );
}
