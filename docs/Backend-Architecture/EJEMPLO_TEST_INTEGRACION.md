# Ejemplo de referencia — Anatomía de un test de integración

**Complemento de `backend/test/README.md`**

---

## 1. Para qué sirve este documento

Muestra, con un ejemplo corto, **cómo se escribe un spec de integración**: su
estructura general, cómo se preparan los datos con factories, cómo se
autentica con `loginAs` y qué se verifica en cada test.

Usa un dominio neutro —los libros de una biblioteca— para que se vea el patrón
y no las reglas del negocio jurídico.

> El recurso `books` no existe en el proyecto: el código es ilustrativo. Los
> helpers que usa (`startTestApp`, `stopTestApp`, `getPrisma`, `expectData`,
> `expectError`, `asAdmin`, `loginAs`) **sí existen** y se usan exactamente así.

El endpoint del ejemplo es `POST /api/v1/books`. Registra un libro con
`title` e `isbn`, requiere el rol `ADMINISTRATOR` y el ISBN no se puede
repetir.

---

## 2. Estructura general de un spec

Todos los specs tienen la misma forma:

```typescript
// 1. Imports: app de test, helpers de contrato, auth y factories
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';

// 2. Un describe por endpoint: método + ruta
describe('POST /api/v1/<recurso>', () => {
  let app: INestApplication;

  // 3. Levantar y cerrar la app: una vez por archivo
  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  // 4. Limpiar las tablas que usa este spec: antes de cada test
  beforeEach(async () => {
    await getPrisma().<tabla>.deleteMany(); // limpieza de datos, no del contenedor
  });

  // 5. Un it por comportamiento, siempre en cuatro pasos
  it('describe en castellano lo que se espera', async () => {
    // Preparar   → datos con factories
    // Ejecutar   → petición HTTP con Supertest
    // Contrato   → status y forma de la respuesta (expectData / expectError)
    // Base       → qué quedó (o qué no quedó) guardado (getPrisma)
  });
});
```

| Bloque       | Cuándo corre           | Para qué                                                  |
| ------------ | ---------------------- | --------------------------------------------------------- |
| `beforeAll`  | Una vez, al empezar    | Levanta la app NestJS contra la base de test              |
| `afterAll`   | Una vez, al terminar   | Cierra la app y la conexión                               |
| `beforeEach` | Antes de cada `it`     | Deja vacías las tablas del spec: cada test arranca de cero |

La base de datos (el contenedor de Testcontainers) **no aparece en el spec**:
la levanta `global-setup.ts` una sola vez para toda la corrida.

---

## 3. La factory — `test/shared/factories/book.factory.ts`

Una factory tiene siempre dos funciones:

```typescript
import { fakerES as faker } from '@faker-js/faker';
import { getPrisma } from '../harness/test-app';

/** Arma el CUERPO de la petición. No toca la base. */
export function aBookBody(overrides: Partial<{ title: string; isbn: string }> = {}) {
  return {
    title: faker.book.title(),
    isbn: faker.commerce.isbn(13),
    ...overrides,
  };
}

/** GUARDA un libro en la base. Sirve para preparar el estado previo. */
export async function createBook(overrides: Partial<{ title: string; isbn: string }> = {}) {
  return getPrisma().book.create({ data: aBookBody(overrides) });
}
```

- `aBookBody()` se usa para **lo que se envía** en el test.
- `createBook()` se usa para **lo que ya tiene que existir** antes del test
  ("dado que ya hay un libro con este ISBN…").
- Los valores por defecto son válidos. El test solo pisa, con `overrides`, el
  campo que le importa: así se ve de un vistazo qué dato es el relevante.

---

## 4. El spec completo — `test/subsystems/books/books.int.spec.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { asAdmin, loginAs } from '../../shared/auth/login-as';
import { aBookBody, createBook } from '../../shared/factories/book.factory';

describe('POST /api/v1/books', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    await getPrisma().book.deleteMany(); // limpieza de datos, no del contenedor
  });

  it('registra un libro', async () => {
    // Preparar
    const body = aBookBody();

    // Ejecutar
    const res = await request(app.getHttpServer())
      .post('/api/v1/books')
      .set(asAdmin())
      .send(body);

    // Contrato
    const book = expectData(res, 201);
    expect(book).toEqual({ id: expect.any(String), title: body.title, isbn: body.isbn });

    // Base
    const saved = await getPrisma().book.findUnique({ where: { isbn: body.isbn } });
    expect(saved).not.toBeNull();
  });

  it('rechaza un libro sin título y no lo guarda', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/books')
      .set(asAdmin())
      .send(aBookBody({ title: '' }));

    expectError(res, 400, 'VALIDATION_ERROR', ['title']);
    expect(await getPrisma().book.count()).toBe(0);
  });

  it('rechaza un ISBN ya registrado', async () => {
    const existing = await createBook();

    const res = await request(app.getHttpServer())
      .post('/api/v1/books')
      .set(asAdmin())
      .send(aBookBody({ isbn: existing.isbn }));

    expectError(res, 409, 'BOOK_ALREADY_EXISTS');
    expect(await getPrisma().book.count()).toBe(1); // solo el que ya existía
  });

  it('responde 401 sin token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/books')
      .send(aBookBody());

    expectError(res, 401, 'UNAUTHENTICATED');
  });

  it('responde 403 si el usuario no es administrador', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/books')
      .set(loginAs({ roles: ['SECRETARY'] }))
      .send(aBookBody());

    expectError(res, 403, 'FORBIDDEN');
    expect(await getPrisma().book.count()).toBe(0);
  });
});
```

**Qué muestra cada test:**

| Test                  | Qué enseña                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Registra un libro     | Los cuatro pasos completos: un `201` no alcanza, también hay que confirmar que se guardó |
| Sin título            | Un error también se verifica en la base: que responda `400` no garantiza que no se guardó nada |
| ISBN ya registrado    | `createBook()` prepara el estado previo; `aBookBody()` arma lo que se envía               |
| Sin token             | Sin `.set(...)` no hay header `Authorization`                                            |
| No es administrador   | `loginAs({ roles })` arma cualquier actor en una línea; `asAdmin()` es el atajo más común |

> **Nota:** hoy el filtro global devuelve `details` con claves `error_0`,
> `error_1`… en lugar del nombre del campo, así que
> `expectError(res, 400, 'VALIDATION_ERROR', ['title'])` falla hasta que se
> corrija. El ejemplo sigue lo que pide el contrato, no el comportamiento actual.

---

## 5. Limpieza de datos entre tests

Todos los specs comparten **la misma base** durante la corrida. Para que un
test no dependa de lo que dejó otro, cada spec limpia sus tablas en
`beforeEach`:

```typescript
beforeEach(async () => {
  await getPrisma().book.deleteMany(); // limpieza de datos, no del contenedor
});
```

Tres reglas:

1. **Limpiar solo las tablas que usa el spec.** Si una tabla no aparece en el
   `beforeEach`, el test no debería depender de lo que haya en ella.
2. **Borrar primero las tablas hijas y después las padres.** Si una clave
   foránea no tiene `onDelete: Cascade`, borrar la tabla padre falla mientras
   queden filas hijas:

   ```typescript
   beforeEach(async () => {
     await getPrisma().loan.deleteMany(); // hija: referencia a book
     await getPrisma().book.deleteMany(); // padre
   });
   ```

3. **Se borran datos, no el contenedor.** La base y las migraciones siguen ahí
   durante toda la corrida.

> Esto funciona porque la suite corre **en serie** (`maxWorkers: 1`). Si algún
> día los specs corren en paralelo contra la misma base, el `deleteMany()` de
> un spec borraría los datos de otro que se está ejecutando.

---

## 6. Lista de control para un spec nuevo

- [ ] El archivo está en `test/subsystems/<subsistema>/` y termina en `.int.spec.ts`.
- [ ] `startTestApp()` en `beforeAll`, `stopTestApp()` en `afterAll`.
- [ ] `beforeEach` limpia con `deleteMany()` las tablas que usa el spec (hijas primero).
- [ ] Los datos se crean con factories: `a<Entidad>Body()` para enviar, `create<Entidad>()` para el estado previo.
- [ ] Cada respuesta se verifica con `expectData` o `expectError`, y cada escritura se verifica en la base.
- [ ] Hay un `401` y un `403` por endpoint protegido, armados con `loginAs`.
