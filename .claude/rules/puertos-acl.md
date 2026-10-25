---
paths:
  - "backend/src/subsystems/cases/**/*.ts"
  - "backend/src/subsystems/people/**/*.ts"
---

<!-- Qué es un puerto de "lookup", quién lo declara, y cómo se aplica el
     patrón al conteo de causas activas (V3 §8.4). Escrito el 07/10/2026
     a partir de los adaptadores que ya existen en el repo. -->

# Puertos ACL entre subsistemas

## Qué significa "lookup"

Nada técnico: **resolver una referencia**. Buscar un dato por su identificador
en otro subsistema, sin acoplarse a él.

`cases` necesita saber el nombre y la matrícula del abogado responsable (RN3),
pero `cases/core` **no puede importar nada de `people`**. La solución, que ya
está implementada en el repo:

1. **`cases` declara qué necesita**, en su propio dominio
   (`cases/core/domain/ports/lawyer-lookup.port.ts`):

   ```ts
   export const LAWYER_LOOKUP = Symbol('LAWYER_LOOKUP');

   /** What `cases` needs to know about a lawyer. */
   export interface LawyerRef {
     id: number;
     fullName: string;
     registrationNumber: string;
   }

   export interface LawyerLookupPort {
     findActiveById(id: number): Promise<LawyerRef | null>;
   }
   ```

   `LawyerRef` tiene **tres campos**, no el `Lawyer` entero. `cases` declara el
   mínimo que le hace falta.

2. **Otro subsistema lo implementa**, en su carpeta `infrastructure/acl/`, y
   traduce su entidad al tipo chico
   (`people/infrastructure/acl/cases-lawyer-lookup.adapter.ts`).

**La regla que hay que retener: el puerto es del que consume, no del que
provee.** `cases` dice "necesito esta forma"; `people` se adapta. Así
`cases/core` depende solo de una interfaz propia. Eso es la inversión de
dependencias, y es lo que permite testear `cases` con un fake sin levantar
`people`.

Por eso se llama **ACL (anti-corruption layer)**: la capa que evita que el
modelo de otro subsistema se filtre al tuyo.

<!-- Nota para mmachuca: hoy LawyerLookupPort tiene DOS implementaciones,
     cases/infrastructure/acl/people-lawyer-lookup.adapter.ts (vía el use case
     de people) y people/infrastructure/acl/cases-lawyer-lookup.adapter.ts
     (vía el repositorio de people). Una de las dos sobra. Vale revisar cuál
     está registrada en los módulos antes de agregar más adaptadores. -->

## `activeCases`: el patrón va al revés

Para `activeCases` **la dirección se invierte**: ahora son los otros subsistemas
los que necesitan un dato de `cases`.

Aplicando la regla de arriba:

- **El puerto lo declara el consumidor.** `people` declara el que necesita para
  abogados y clientes. `legal-parameters` declara el suyo para estados
  procesales y calificaciones legales. **No los declares en `cases`.**
- **`cases` los implementa**, en `cases/infrastructure/acl/`.

Entonces: la funcionalidad no es de HU20/HU22, pero **el adaptador sí es código
de `cases`**, o sea trabajo de mmachuca. Que quede dicho antes de que se lo
pidan como un favor de cinco minutos.

### Forma del puerto: por lote, no de a uno

Lo declararía así el consumidor (ejemplo para `people`):

```ts
// people/core/domain/ports/active-case-counter.port.ts
export const ACTIVE_CASE_COUNTER = Symbol('ACTIVE_CASE_COUNTER');

export interface ActiveCaseCounterPort {
  /** Causas activas por abogado responsable. Un id sin causas devuelve 0. */
  countByResponsibleLawyer(lawyerIds: number[]): Promise<Map<number, number>>;
  /** Causas activas por cliente. Un id sin causas devuelve 0. */
  countByClient(clientIds: number[]): Promise<Map<number, number>>;
}
```

**Recibe un array y devuelve un `Map`, no un número.** Es la decisión de diseño
importante: `GET /lawyers` es un listado paginado, y un método
`countByLawyer(id)` llamado una vez por abogado es un N+1 — veinte consultas
para una página de veinte abogados. Con el lote, es una sola consulta con
`GROUP BY`.

Un id que no tiene causas **tiene que venir como `0`**, no ausente del `Map`,
para que el consumidor no tenga que acordarse de poner el valor por defecto.

### La definición de "causa activa" vive en `cases`

Y esa es la razón de fondo por la que el adaptador va en `cases`: una causa es
activa cuando **no fue dada de baja y su estado actual no es terminal** (ni
Archivada ni Prescripta). Eso es conocimiento del dominio de causas. Si el
conteo lo hiciera cada módulo por su cuenta, esa regla quedaría duplicada en
cuatro lugares y se desincronizaría.

Recordatorios de la definición:

- Un estado escrito a mano **no** es terminal: la causa que lo tiene es activa.
- El estado inicial tampoco: cuenta para su abogado, su cliente y sus
  calificaciones, pero **no** para el `activeCases` de ningún estado procesal,
  porque el estado inicial no forma parte del listado de estados.

### Nombre

`...LookupPort` se usa para resolver una referencia. Para contar, `lookup` no
describe nada: usá `ActiveCaseCounterPort` o similar. El glosario es de
cumplimiento obligatorio para los conceptos del dominio, y "causa activa" es
uno (`activeCases` en el contrato).
