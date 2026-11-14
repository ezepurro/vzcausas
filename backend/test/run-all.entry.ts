import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Entrada de la corrida completa de integración (`npm run test:int:all`).
 *
 * Jest arma un registro de módulos nuevo por cada archivo de test: con un
 * archivo por suite, cada una vuelve a cargar y evaluar todo el grafo de
 * `AppModule` (cientos de archivos de `src` y de `node_modules`), y eso
 * cuesta entre 3 y 7 s por suite, mucho más que arrancar Nest (~1 s).
 *
 * Este archivo hace `require` de TODAS las suites `*.int.spec.ts`, así que
 * comparten ese registro y el grafo se carga una sola vez. Cada suite sigue
 * levantando y cerrando su propia app en su `beforeAll` / `afterAll`: lo que
 * se comparte es el código cargado, no las instancias.
 *
 * Cada suite va dentro de un `describe('[<ruta>]')`:
 *   - el nombre del archivo queda en el reporte (`[subsystems/people/lawyers] › …`);
 *   - los `beforeAll` / `afterAll` que una suite declara fuera de su `describe`
 *     quedan acotados a ella y no se aplican a las demás.
 *
 * Para correr una sola suite (o filtrar por ruta) se usa `npm run test:int`,
 * que sigue siendo un archivo por suite. Ver `test/README.md` §6.
 */
const SUFFIX = '.int.spec.ts';

// `shared/` no contiene tests (README §2); el filtro por sufijo ya lo excluye,
// y excluye también a este archivo.
const suites = readdirSync(__dirname, { recursive: true, encoding: 'utf8' })
  .map((path) => path.replace(/\\/g, '/'))
  .filter((path) => path.endsWith(SUFFIX))
  .sort();

if (suites.length === 0) {
  throw new Error(`No se encontró ninguna suite *${SUFFIX} bajo ${__dirname}.`);
}

for (const suite of suites) {
  describe(`[${suite.slice(0, -SUFFIX.length)}]`, () => {
    // El bloque con llaves es a propósito: `describe` no admite que el callback
    // devuelva algo, y `require` devuelve las exportaciones del módulo.
    require(join(__dirname, suite));
  });
}
