# Ejemplo de referencia — Anatomía de un test de integración

**Complemento de `backend/test/README.md` y de `EJEMPLO_CASO_DE_USO.md`**

---

## 1. Para qué sirve este documento

Este documento muestra **la forma** de un test de integración del backend: qué
archivos intervienen, en qué orden se escriben y cómo se combinan el harness,
las factories, Testcontainers y los helpers de contrato.

Usa el **mismo dominio neutro que `EJEMPLO_CASO_DE_USO.md`**: el préstamo de
libros en una biblioteca. La razón es la misma: con un dominio ajeno al
proyecto, todo lo que queda en pie **es** el patrón, y no se mezcla con las
reglas del negocio jurídico. Además, como ese documento ya explicó cómo se
construye el subsistema `loans`, acá se ve cómo se testea **ese mismo código**.

> El código es ilustrativo: el subsistema `loans` no existe en el proyecto.
> Los componentes compartidos que usa (`startTestApp`, `resetDatabase`,
> `getPrisma`, `expectData`, `expectError`, `expectPaginated`, `asAdmin`,
> `loginAs`) **sí existen** y se usan exactamente así.

---

## 2. Qué se va a verificar

El caso de uso es **prestar un libro a un socio** (`POST /api/v1/loans`), más
el listado de libros disponibles (`GET /api/v1/books`). Las reglas vienen de
`EJEMPLO_CASO_DE_USO.md` §2:

| #   | Regla                                                         | Qué tiene que comprobar el test de integración                         |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| R1  | Un libro solo puede prestarse si está disponible              | `422 BOOK_NOT_AVAILABLE` y el libro sigue con su préstamo anterior     |
| R2  | Un socio con préstamos vencidos no puede llevarse otro libro  | `422 MEMBER_HAS_OVERDUE_LOANS` y no se crea ningún préstamo            |
| R3  | La fecha de devolución depende del tipo de socio              | La `dueDate` **guardada en la base** es la correcta (14 o 30 días)     |
| R4  | Al concretarse el préstamo se envía un comprobante por correo | Se invoca al puerto de correo; si el correo falla, el préstamo persiste |

Y lo transversal, que vale para cualquier endpoint:

| Aspecto                     | Respuesta esperada según el contrato           |
| --------------------------- | ---------------------------------------------- |
| Cuerpo inválido             | `400 VALIDATION_ERROR` con `details` por campo |
| Recurso inexistente         | `404 BOOK_NOT_FOUND`                           |
| Sin token                   | `401 UNAUTHENTICATED`                          |
| Token sin el rol requerido  | `403 FORBIDDEN`                                |
| Alta exitosa                | `201` con `{ "data": { … } }`                  |
| Listado                     | `200` con `{ "data": [], "pagination": {…} }`  |

> **Qué NO se prueba acá:** el cálculo en sí de la fecha de devolución, ni que
> la entidad `Book` rechace un segundo préstamo. Eso es lógica pura y va en los
> tests unitarios, al lado del código (`book.entity.spec.ts`). El test de
> integración prueba que, **pasando por HTTP y por PostgreSQL**, el resultado
> queda bien guardado y la respuesta cumple el contrato.

---

## 3. Archivos que intervienen

```
backend/test/
├── subsystems/
│   └── loans/
│       ├── lend-book.int.spec.ts        ← (5) el spec: POST /loans
│       └── list-books.int.spec.ts       ← (6) el spec: GET /books
└── shared/
    ├── factories/
    │   ├── book.factory.ts              ← (1) datos de libros
    │   ├── member.factory.ts            ← (2) datos de socios
    │   └── loan.factory.ts              ← (3) cuerpo de la petición
    ├── fakes/
    │   └── fake-receipt-sender.ts       ← (4) reemplazo del correo
    ├── harness/   (ya existe)           ← contenedor, app, base
    ├── contract/  (ya existe)           ← verificación del contrato
    └── auth/      (ya existe)           ← actores autenticados
```

El orden de trabajo es el de los números: primero los datos, después el fake,
al final los specs.

---

## 4. Factories — los datos del test

### 4.1 `shared/factories/book.factory.ts`

```typescript
import { fakerES as faker } from "@faker-js/faker";
import { getPrisma } from "../harness/test-app";

/** Persiste un libro. Por defecto: disponible y con ISBN válido. */
export async function createBook(
	overrides: Partial<{ title: string; isbn: string; available: boolean }> = {},
) {
	return getPrisma().book.create({
		data: {
			title: overrides.title ?? faker.book.title(),
			isbn: overrides.isbn ?? faker.commerce.isbn(13),
			available: overrides.available ?? true,
		},
	});
}

/** Persiste un libro que YA está prestado a otro socio. */
export async function createLentBook(memberId: string) {
	const book = await createBook({ available: false });
	await getPrisma().loan.create({
		data: { bookId: book.id, memberId, dueDate: faker.date.soon({ days: 10 }) },
	});
	return book;
}
```

### 4.2 `shared/factories/member.factory.ts`

```typescript
import { fakerES as faker } from "@faker-js/faker";
import { getPrisma } from "../harness/test-app";

type MemberCategory = "STANDARD" | "RESEARCHER";

/** Persiste un socio. Por defecto: categoría STANDARD y sin préstamos vencidos. */
export async function createMember(
	overrides: Partial<{ fullName: string; category: MemberCategory }> = {},
) {
	return getPrisma().member.create({
		data: {
			fullName: overrides.fullName ?? faker.person.fullName(),
			email: faker.internet.email().toLowerCase(),
			category: overrides.category ?? "STANDARD",
		},
	});
}

/** Persiste un socio con un préstamo cuya fecha de devolución ya pasó. */
export async function createMemberWithOverdueLoan() {
	const member = await createMember();
	const book = await getPrisma().book.create({
		data: { title: faker.book.title(), isbn: faker.commerce.isbn(13), available: false },
	});
	await getPrisma().loan.create({
		data: { bookId: book.id, memberId: member.id, dueDate: faker.date.past() },
	});
	return member;
}
```

### 4.3 `shared/factories/loan.factory.ts`

```typescript
export interface LendBookBody {
	isbn: string;
	memberId: string;
}

/** Cuerpo de POST /loans. No toca la base: solo arma el JSON. */
export function aLendBookBody(overrides: Partial<LendBookBody> = {}): LendBookBody {
	return {
		isbn: "978-3-16-148410-0",
		memberId: "00000000-0000-0000-0000-000000000000",
		...overrides,
	};
}
```

**Qué ilustra.**

- **Dos tipos de función, dos propósitos.** `create*()` **persiste** el estado
  previo ("dado que existe un libro prestado…"); `a*Body()` **arma** la
  petición que se va a probar, sin tocar la base.
- **Los valores por defecto son válidos.** El test solo pisa lo que le importa:
  `createBook({ available: false })` dice, a simple vista, que lo relevante es
  la disponibilidad.
- **Los estados complejos tienen nombre.** `createMemberWithOverdueLoan()` se
  lee como la precondición de R2. Si el test armara el socio, el libro y el
  préstamo vencido a mano, la intención se perdería entre líneas de Prisma.
- **Las factories usan Prisma directo, no la API.** Preparar datos por HTTP
  haría que un test de préstamos falle por un bug en el alta de libros.

---

## 5. Fake de un adaptador externo

`shared/fakes/fake-receipt-sender.ts`

```typescript
import { ReceiptSenderPort } from "@subsystems/loans/core/domain/ports/receipt-sender.port";

/** Reemplaza al correo real: registra lo enviado y puede simular una falla. */
export class FakeReceiptSender implements ReceiptSenderPort {
	sent: Array<{ memberId: string; bookTitle: string; dueDate: Date }> = [];
	shouldFail = false;

	async send(receipt: { memberId: string; bookTitle: string; dueDate: Date }): Promise<void> {
		if (this.shouldFail) throw new Error("SMTP caído (simulado)");
		this.sent.push(receipt);
	}

	reset(): void {
		this.sent = [];
		this.shouldFail = false;
	}
}
```

**Qué ilustra.**

- **Solo se reemplaza lo que está fuera del sistema.** Un test de integración
  no puede depender de un servidor de correo (o de Google Drive). La base de
  datos, en cambio, **nunca** se reemplaza: es real, gracias a Testcontainers.
- **El fake implementa el puerto.** Como el caso de uso depende de
  `ReceiptSenderPort` y no de una clase concreta, cambiar el adaptador es una
  línea en `startTestApp()`. Es la arquitectura hexagonal pagando dividendos.
- **Guarda lo que recibió.** Así el test puede verificar R4 sin mandar mails.

---

## 6. El spec — `subsystems/loans/lend-book.int.spec.ts`

### 6.1 Esqueleto: harness y ciclo de vida

```typescript
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { startTestApp, stopTestApp, getPrisma } from "../../shared/harness/test-app";
import { resetDatabase } from "../../shared/harness/database";
import { expectData, expectError } from "../../shared/contract/envelopes";
import { asAdmin, loginAs } from "../../shared/auth/login-as";
import { createBook, createLentBook } from "../../shared/factories/book.factory";
import { createMember, createMemberWithOverdueLoan } from "../../shared/factories/member.factory";
import { aLendBookBody } from "../../shared/factories/loan.factory";
import { FakeReceiptSender } from "../../shared/fakes/fake-receipt-sender";
import { RECEIPT_SENDER } from "@subsystems/loans/core/domain/ports/receipt-sender.port";

describe("POST /api/v1/loans", () => {
	let app: INestApplication;
	const receipts = new FakeReceiptSender();

	beforeAll(async () => {
		app = await startTestApp((builder) =>
			builder.overrideProvider(RECEIPT_SENDER).useValue(receipts),
		);
	});

	afterAll(async () => {
		await stopTestApp();
	});

	beforeEach(async () => {
		await resetDatabase();
		receipts.reset();
	});

	const lend = (body: object, headers = asAdmin()) =>
		request(app.getHttpServer()).post("/api/v1/loans").set(headers).send(body);

	// … los tests de las secciones 6.2 a 6.6
});
```

**Qué ilustra.**

- **`beforeAll` / `afterAll` → la app; `beforeEach` → los datos.** Levantar
  NestJS cuesta; vaciar tablas, milisegundos. El contenedor de PostgreSQL ni
  aparece acá: lo maneja `global-setup.ts` una sola vez para toda la corrida.
- **`resetDatabase()` en cada test.** Cada `it` arranca con la base vacía y no
  depende del orden. Nada de `deleteMany()` modelo por modelo, que se rompe en
  cuanto aparece una tabla nueva o una clave foránea.
- **Un helper local (`lend`)** evita repetir la ruta y el header en cada test.
  Lleva el prefijo `/api/v1`, porque la app de test usa `configureApp()`, igual
  que producción.

### 6.2 Préstamo exitoso — contrato + base + efecto externo

```typescript
it("presta un libro disponible y devuelve el préstamo creado", async () => {
	const member = await createMember({ category: "STANDARD" });
	const book = await createBook({ title: "Rayuela" });

	const res = await lend(aLendBookBody({ isbn: book.isbn, memberId: member.id }));

	// 1. Contrato: 201 + { data: {...} } con los campos del contrato
	const loan = expectData(res, 201);
	expect(loan).toEqual({
		id: expect.any(String),
		isbn: book.isbn,
		memberId: member.id,
		dueDate: expect.any(String),
	});

	// 2. Base: el préstamo existe y el libro quedó no disponible (R1)
	const stored = await getPrisma().loan.findUniqueOrThrow({ where: { id: loan.id } });
	expect(stored.memberId).toBe(member.id);
	expect((await getPrisma().book.findUniqueOrThrow({ where: { id: book.id } })).available).toBe(false);

	// 3. Efecto externo: se envió el comprobante (R4)
	expect(receipts.sent).toEqual([expect.objectContaining({ memberId: member.id, bookTitle: "Rayuela" })]);
});

it("calcula la devolución a 30 días para un socio investigador", async () => {
	const member = await createMember({ category: "RESEARCHER" });
	const book = await createBook();

	const res = await lend(aLendBookBody({ isbn: book.isbn, memberId: member.id }));

	const loan = expectData<{ id: string }>(res, 201);
	const stored = await getPrisma().loan.findUniqueOrThrow({ where: { id: loan.id } });
	const days = Math.round((stored.dueDate.getTime() - stored.createdAt.getTime()) / 86_400_000);
	expect(days).toBe(30); // R3, verificado sobre lo PERSISTIDO
});

it("concreta el préstamo aunque falle el envío del comprobante", async () => {
	receipts.shouldFail = true;
	const member = await createMember();
	const book = await createBook();

	const res = await lend(aLendBookBody({ isbn: book.isbn, memberId: member.id }));

	expectData(res, 201);
	expect(await getPrisma().loan.count()).toBe(1); // el correo es complementario
});
```

**Qué ilustra.** Cada test verifica **tres capas**, en este orden:

1. **El contrato**, con `expectData`: status, `Content-Type` y sobre `{ data }`.
   Después, `toEqual` sobre `data` fija los campos exactos. Un campo de más
   (por ejemplo, que se filtre un campo interno) también hace fallar el test.
2. **La base**, con `getPrisma()`: un `201` no alcanza, hay que confirmar que el
   registro existe y con qué valores. R3 se verifica sobre la fecha
   **guardada**, no sobre la que devolvió la respuesta.
3. **Los efectos externos**, con el fake.

El tercer test verifica la regla 5 de `EJEMPLO_CASO_DE_USO.md` (puerto
complementario): la caída del correo no aborta el préstamo.

### 6.3 Validación — `400 VALIDATION_ERROR`

```typescript
it("rechaza un cuerpo sin ISBN y no crea nada", async () => {
	const member = await createMember();

	const res = await lend({ memberId: member.id });

	expectError(res, 400, "VALIDATION_ERROR", ["isbn"]);
	expect(await getPrisma().loan.count()).toBe(0);
});

it("rechaza campos que no están en el contrato", async () => {
	const res = await lend({ ...aLendBookBody(), discount: 50 });

	expectError(res, 400, "VALIDATION_ERROR", ["discount"]);
});
```

**Qué ilustra.**

- `expectError(res, 400, "VALIDATION_ERROR", ["isbn"])` verifica **todo** el
  sobre de error del contrato (§5.2) y además que `details` nombre el campo
  inválido. El frontend usa `details` para marcar el campo en el formulario:
  si no viene, la pantalla no puede mostrar el error donde corresponde.
- **Un error también se verifica en la base.** Que responda `400` no garantiza
  que no se haya guardado nada a medias.
- El segundo test cubre `forbidNonWhitelisted`, que viene de `configureApp()`.
  Si alguien lo sacara de `app.setup.ts`, este test lo detecta.

### 6.4 Reglas de negocio — `422`

```typescript
it("rechaza prestar un libro que ya está prestado (R1)", async () => {
	const previousHolder = await createMember();
	const book = await createLentBook(previousHolder.id);
	const member = await createMember();

	const res = await lend(aLendBookBody({ isbn: book.isbn, memberId: member.id }));

	expectError(res, 422, "BOOK_NOT_AVAILABLE");
	const loans = await getPrisma().loan.findMany({ where: { bookId: book.id } });
	expect(loans).toHaveLength(1);
	expect(loans[0].memberId).toBe(previousHolder.id); // el préstamo original sigue intacto
	expect(receipts.sent).toHaveLength(0);
});

it("rechaza el préstamo a un socio con préstamos vencidos (R2)", async () => {
	const member = await createMemberWithOverdueLoan();
	const book = await createBook();
	const before = await getPrisma().loan.count();

	const res = await lend(aLendBookBody({ isbn: book.isbn, memberId: member.id }));

	expectError(res, 422, "MEMBER_HAS_OVERDUE_LOANS");
	expect(await getPrisma().loan.count()).toBe(before);
	expect((await getPrisma().book.findUniqueOrThrow({ where: { id: book.id } })).available).toBe(true);
});
```

**Qué ilustra.**

- **`400` y `422` no son intercambiables** (contrato §6): `400` significa que
  los datos son inválidos; `422`, que son válidos pero la regla de negocio
  impide la operación. El test fija cuál corresponde.
- **Se discrimina por `code`, nunca por `message`.** El texto puede cambiar sin
  romper nada; el código es el contrato con el frontend.
- **R2 cruza subsistemas** (el estado del socio lo resuelve el adaptador
  anticorrupción `MembersStatusAdapter`). Solo un test de integración, con la
  base real, comprueba que el cruce funciona: en un test unitario ese puerto
  estaría mockeado.

### 6.5 Recurso inexistente — `404`

```typescript
it("responde 404 si el ISBN no corresponde a ningún libro", async () => {
	const member = await createMember();

	const res = await lend(aLendBookBody({ isbn: "978-0-00-000000-2", memberId: member.id }));

	expectError(res, 404, "BOOK_NOT_FOUND");
});
```

### 6.6 Autenticación y autorización — `401` / `403`

```typescript
it("responde 401 sin token", async () => {
	const res = await request(app.getHttpServer()).post("/api/v1/loans").send(aLendBookBody());

	expectError(res, 401, "UNAUTHENTICATED");
});

it("responde 403 si el usuario no tiene el permiso loan:create", async () => {
	const res = await lend(aLendBookBody(), loginAs({ roles: ["SECRETARY"], permissions: [] }));

	expectError(res, 403, "FORBIDDEN");
	expect(await getPrisma().loan.count()).toBe(0);
});
```

**Qué ilustra.** `loginAs()` arma el actor en una línea, sin pasar por
`POST /auth/login`. Con uno de cada (`401` y `403`) por endpoint alcanza para
confirmar que el guard está aplicado. La matriz completa de roles y permisos
corresponde al subsistema `identity`, no se repite en cada módulo.

---

## 7. El spec — `subsystems/loans/list-books.int.spec.ts`

```typescript
describe("GET /api/v1/books", () => {
	let app: INestApplication;

	beforeAll(async () => { app = await startTestApp(); });
	afterAll(async () => { await stopTestApp(); });
	beforeEach(async () => { await resetDatabase(); });

	const list = (query = "") =>
		request(app.getHttpServer()).get(`/api/v1/books${query}`).set(asAdmin());

	it("pagina el listado y devuelve la metadata del contrato", async () => {
		for (let i = 0; i < 25; i++) await createBook();

		const res = await list("?page=2&limit=10");

		const books = expectPaginated(res, { page: 2, limit: 10, totalItems: 25, totalPages: 3 });
		expect(books).toHaveLength(10);
	});

	it("filtra solo los disponibles", async () => {
		const member = await createMember();
		await createBook({ title: "Disponible" });
		await createLentBook(member.id);

		const res = await list("?available=true");

		const books = expectPaginated(res, { totalItems: 1 });
		expect(books.map((b) => b.title)).toEqual(["Disponible"]);
	});

	it("con la base vacía devuelve data vacío y totales en 0", async () => {
		const res = await list();

		expectPaginated(res, { totalItems: 0, totalPages: 0 });
	});

	it("rechaza un limit fuera de rango", async () => {
		const res = await list("?limit=500");

		expectError(res, 400, "INVALID_PAGINATION");
	});
});
```

**Qué ilustra.**

- `expectPaginated` verifica la forma completa de la colección (§5.1) y, con el
  segundo argumento, los valores de la paginación. Los datos los genera la
  factory: 25 libros en una línea.
- **La base vacía también es parte del contrato.** El frontend depende de que
  `totalPages` sea `0` y no `1` para mostrar el estado vacío.
- Los filtros se verifican con datos que **deberían quedar afuera** (el libro
  prestado). Si solo se crean datos que cumplen el filtro, un filtro que no
  filtra nada también pasaría.

---

## 8. Las reglas que el ejemplo ilustra

| #   | Regla                                                            | Dónde se ve                     |
| --- | ---------------------------------------------------------------- | ------------------------------- |
| 1   | La app de test es la de producción (`configureApp`)              | §6.1, §6.3 — prefijo y whitelist |
| 2   | La base es real; solo se reemplazan servicios externos           | §5, §6.1                        |
| 3   | Cada test arranca con la base vacía (`resetDatabase`)            | §6.1                            |
| 4   | Los datos previos se crean con factories, no con la API          | §4                              |
| 5   | Cada test verifica contrato **y** base                           | §6.2 a §6.6                     |
| 6   | Las escrituras rechazadas verifican que no se guardó nada        | §6.3, §6.4, §6.6                |
| 7   | Los errores se discriminan por `code`                            | §6.3 a §6.6                     |
| 8   | La lógica pura queda en los tests unitarios, no se repite acá    | §2                              |

---

## 9. Equivalencia con el sistema real

| Pieza del ejemplo                 | Equivalente en VZ Causas                              |
| --------------------------------- | ----------------------------------------------------- |
| `test/subsystems/loans/`          | `test/subsystems/people/`, `test/subsystems/cases/`…  |
| `createBook()` / `createMember()` | `createLawyer()`, `createClient()`, `createCase()`    |
| `aLendBookBody()`                 | `aLawyerBody()`, `aUserBody()`                        |
| `BOOK_NOT_AVAILABLE` (422)        | `BUSINESS_RULE_VIOLATION`, `INVALID_CURRENT_PASSWORD` |
| `BOOK_NOT_FOUND` (404)            | `LAWYER_NOT_FOUND`, `USER_NOT_FOUND`…                 |
| Unicidad (no está en el ejemplo)  | `409 LAWYER_REGISTRATION_ALREADY_EXISTS`: mismo patrón que §6.4 |
| `FakeReceiptSender`               | Fake de `CaseFolderPort` (Google Drive), del aviso de vencimientos |
| `GET /books?available=true`       | `GET /lawyers`, `GET /users?role=LAWYER`              |

---

## 10. Lista de control para un spec nuevo

- [ ] El archivo está en `test/subsystems/<subsistema>/` y termina en `.int.spec.ts`.
- [ ] `startTestApp()` en `beforeAll`, `stopTestApp()` en `afterAll`, `resetDatabase()` en `beforeEach`.
- [ ] Los datos previos se crean con factories; las factories nuevas están en `shared/factories/`.
- [ ] Todas las rutas llevan `/api/v1`.
- [ ] Cada respuesta se verifica con `expectData`, `expectPaginated`, `expectError` o `expectNoContent`.
- [ ] Toda escritura exitosa verifica la base; toda escritura rechazada verifica que no se guardó nada.
- [ ] Hay un `401` y un `403` por endpoint protegido.
- [ ] Solo se reemplazan adaptadores de servicios externos, nunca repositorios.
- [ ] El spec pasa solo (`npm run test:int -- <archivo>`) y con toda la suite.
