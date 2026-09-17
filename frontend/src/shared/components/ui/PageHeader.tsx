import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** antetítulo en mayúsculas: el grupo del rail al que pertenece la pantalla */
  antetitulo?: string;
  titulo: string;
  sub?: string;
  acciones?: ReactNode;
}

export function PageHeader({ antetitulo, titulo, sub, acciones }: PageHeaderProps) {
  return (
    <header className="vz-page-head">
      <div>
        {antetitulo && <div className="vz-eyebrow">{antetitulo}</div>}
        <h1 className="vz-page-head__title">{titulo}</h1>
        {sub && <p className="vz-page-head__sub">{sub}</p>}
      </div>
      {acciones && <div className="vz-page-head__actions">{acciones}</div>}
    </header>
  );
}
