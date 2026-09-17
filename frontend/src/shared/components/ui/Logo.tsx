export interface LogoProps {
  /** oculta el texto y deja solo el monograma (rail colapsado) */
  soloMarca?: boolean;
}

/** Monograma VZ del estudio. Va sobre el rail oscuro. */
export function Logo({ soloMarca = false }: LogoProps) {
  return (
    <div className="vz-rail__logo">
      <svg width="30" height="21" viewBox="0 0 60 42" fill="none" style={{ flex: '0 0 30px' }} aria-hidden="true">
        <path d="M2 2h12l10 26L34 2h12L28 40H16L2 2z" fill="var(--vz-rail-logo)" />
        <path d="M38 2h20L40 34h18v6H30L48 8H38V2z" fill="var(--vz-rail-logo)" opacity=".55" />
      </svg>
      {!soloMarca && (
        <div className="vz-rail__wordmark">
          <div className="vz-rail__name">VZ Causas</div>
          <div className="vz-rail__studio">Vázquez &amp; Zárate</div>
        </div>
      )}
    </div>
  );
}
