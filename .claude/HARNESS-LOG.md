# Bitácora del harness

Para qué sirve este archivo: es lo que te permite saber si una regla **sirvió**
o es decoración. Sin esto estás en el 60% de los harnesses que se optimizan a
ciegas.

Regla de oro del campo: **el harness se construye hacia atrás, a partir de
fallas reales.** Si nunca fallaste en algo, no escribas la regla — una regla
preventiva para un problema que no tuviste baja la adherencia a las que sí
importan.

Formato, tres líneas por incidente:

```
## <fecha>
- Falló: <qué hizo mal la IA, concreto>
- Hice: <qué regla, hook o doc agregué o cambié>
- ¿Sirvió? → revisar el <fecha + 2 semanas>
```

Al cierre de cada sprint:

1. Leé los "¿Sirvió?" vencidos. Si una regla no evitó que el problema vuelva,
   no la dejes "por si acaso": cambiala o borrala.
2. Corré `/doctor prompt-audit` para que te busque reglas contradictorias,
   referencias a archivos que ya no existen e instrucciones escritas para
   modelos viejos.
3. Actualizá la fecha de revisión en `.claude/CLAUDE.md`.

Acordate del caso de Anthropic: agregaron resets para la "ansiedad de contexto",
y con Opus 4.5 el comportamiento desapareció — los resets quedaron como peso
muerto. **Tu harness envejece con cada mejora de modelo.**

---

## 2026-10-06 — nacimiento

- Falló: nada todavía. El harness arranca vacío a propósito.
- Hice: creé `.claude/` con `CLAUDE.md`, las reglas (`dominio`, `auditoria`,
  `puertos-acl`, `consultar-causas`, `criterios-aceptacion`,
  `decisiones-tecnicas`), el hook de registro de cambios y el de verificación
  al cerrar turno.
- ¿Sirvió? → revisar el 20/10/2026.

<!-- Corregido el 08/10/2026: esta entrada decía "tres reglas (dominio,
     hexagonal, auditoria)". `hexagonal` nunca existió como archivo;
     `puertos-acl.md` parece haber sido su reemplazo. -->

<!-- Orden elegido: el más reciente ABAJO. Mantenerlo. -->

---

## 2026-10-08 — primera revisión, antes de usarlo en serio

Nada de esto lo falló la IA: lo falló el harness. Van por separado porque
cada uno se revisa distinto.

**1. El harness no estaba activo.**

- Falló: `settings.local.json` no era JSON válido — faltaba una coma después
  del array `ask` y sobraba una después de `allow`. Como el archivo entero no
  parseaba, **nada de lo que contenía estaba en efecto**: ni el `deny` de
  `prisma migrate reset`, ni el `ask` de commit/push, ni los dos hooks. La
  prueba independiente: `.claude/audit/` no existía pese a que hubo ediciones
  en el working tree, o sea que `registrar-cambio.ps1` no corrió una sola vez
  desde el 06/10.
- Hice: se corrigió el JSON y se agregó `PowerShell(prisma migrate reset:*)`,
  que faltaba siendo PowerShell el shell primario. Verificado con `JSON.parse`:
  4 deny, 4 ask, 2 allow, hooks `PostToolUse` + `Stop`.
- ¿Sirvió? → revisar el 22/10/2026. **Qué mirar:** que `.claude/audit/` exista
  y tenga una fila por edición. Si sigue vacío, los hooks siguen sin
  dispararse y el problema es otro.

**2. Dos reglas opuestas cargando sobre los mismos archivos.**

- Falló: `auditoria.md` cargaba en **todo** caso de uso (`paths` con
  `subsystems/**`) y mandaba llamar a `AuditTrailPort.record` en
  `src/shared/domain/audit-trail.port.ts`. Verificado: ese archivo no existe,
  no hay ni una referencia a `AuditTrail` en todo `backend/src`, y
  `shared/infrastructure/audit/` tiene sólo un `.gitkeep`. Encima contradecía
  a `consultar-causas.md`, que deja la auditoría fuera del Sprint 2.
- Hice: archivé la regla apuntando su `paths` al archivo inexistente. No carga
  nunca, no gasta contexto, y se despierta sola el día que el puerto exista.
  El contenido quedó intacto.
- ¿Sirvió? → se revisa cuando la auditoría entre en alcance, no por fecha.
  **Ojo al reactivar:** hay que ensanchar el `paths` otra vez, porque como
  está sólo carga al abrir el propio puerto, no al escribir un caso de uso.

**3. Los TODO.**

- Falló: #1 y #3 vacíos; el borrador de #1 estaba escrito **arriba** del
  encabezado, así que entraba en contexto completo, cortado a mitad de frase.
- Hice: #1 y #3 tienen borrador mío, marcado como tal, derivado de las reglas
  y del código —no de mmachuca—. #5 ya estaba respondido: le saqué el bloque
  de preguntas. #2 queda vacío a propósito (decisión del 08/10): no hay
  correcciones registradas todavía, y una regla inventada baja la adherencia.
- ¿Sirvió? → revisar el 22/10/2026. **Qué mirar:** si los borradores siguen
  textuales, no sirvieron — significa que nadie los corrigió y son míos, no
  tuyos.

---

## 2026-10-08 (bis) — por qué los hooks nunca corrieron

El incidente más útil del harness hasta ahora, porque lo que falló fue el método
de verificación, no el código.

- Falló: los hooks no se dispararon nunca. Más arriba atribuí la causa al JSON
  inválido y dije que se arreglaría solo en la sesión siguiente. **Era
  incorrecto.** En una sesión nueva, con el JSON válido, siguieron muertos.
- Causa real: **los dos `.ps1` están en UTF-8 sin BOM y el hook los invoca con
  `powershell.exe`**, que es Windows PowerShell 5.1. Sin BOM, 5.1 lee los `.ps1`
  como ANSI/cp1252: los acentos y el em-dash se corrompen y el parser revienta
  antes de ejecutar una línea. La pista estaba en el error que trajo mmachuca:
  `â€”`, que es `—` (UTF-8 `E2 80 94`) leído como cp1252.
  `registrar-cambio.ps1` tiene 11 bytes no-ASCII; `verificar.ps1`, 25.
- **Por qué mi verificación no lo detectó:** validé con `[Parser]::ParseFile`
  corriendo bajo **pwsh 7.6.6**, que lee UTF-8 sin BOM correctamente. El hook
  ejecuta con **powershell.exe 5.1**. Validé con un motor distinto del que
  ejecuta, y reporté "sintaxis OK" sobre un archivo que no parsea en producción.
- Hice: nada en los `.ps1` — el classifier me bloquea editarlos y ejecutarlos.
  El arreglo lo aplica mmachuca: guardar los dos como **UTF-8 con BOM**.
- ¿Sirvió? → revisar en la primera edición después del arreglo. **Qué mirar:**
  que aparezca `.claude/audit/` con una fila.

**La regla que sale de esto, y que vale más que el arreglo:**

> Verificá con el mismo motor que lo va a ejecutar. Un chequeo que corre en otro
> intérprete, otra versión u otro encoding no es una verificación: es una
> segunda opinión de alguien que no va a hacer el trabajo.

Aplica más allá de PowerShell: `tsc` con otro `tsconfig` que el build, un test
con otro `NODE_ENV` que producción, un linter con otra config que CI.

Corolario para este harness: si un `.ps1` lleva un solo carácter no-ASCII,
**necesita BOM** o hay que invocarlo con `pwsh`. Como está escrito en castellano,
todos van a llevar acentos: acá el BOM no es opcional.

---

## 2026-10-18 — el harness no siguió al Sprint

- Falló: al arrancar Sprint 3 (HU30, HU32), `.claude/CLAUDE.md` seguía
  apuntando a `API_CONTRACT_V3.md` como fuente de verdad #1, pero ya existe
  `API_CONTRACT_V4.md` (14/10/2026), autocontenido y vigente (D-46), igual
  que V3 lo fue de V2. El harness no se actualizó solo entre sprints — nada
  lo hace automáticamente — y una sesión nueva habría trabajado contra un
  contrato viejo sin que nadie lo notara, porque V3 "parece" completo.
  Encima el pedido original hablaba de armar "un subsystem notifications",
  que no existe en el mapa: `ARQUITECTURA_BACKEND_V1.md:184` ya asignó EP-06
  a la carpeta `deadlines` desde la V1 de la arquitectura.
- Hice: actualicé `.claude/CLAUDE.md` (fuentes de verdad y alcance de
  trabajo), agregué `.claude/rules/notificaciones.md` con las decisiones de
  HU30/HU32 y la corrección de nombre, y dos ADR nuevos:
  `ADR-004_EMAIL_GMAIL_API.md` (proveedor de correo, no decidido en ningún
  lado) y la extensión de autorización OAuth sobre ADR-003. También resolví
  con mmachuca el riesgo R-01 (disparo diario), que la arquitectura dejaba
  "sin decisión, acción requerida antes de Sprint 3" — y ya estábamos en
  Sprint 3 sin que nadie lo hubiera resuelto.
- ¿Sirvió? → revisar al cierre de Sprint 3. **Qué mirar:** si al empezar un
  sprint nuevo alguien (yo u otra sesión) vuelve a trabajar contra un
  contrato de API viejo, el "revisar al cierre de cada sprint" de arriba no
  alcanza — hace falta un chequeo **al abrir** el sprint, no solo al
  cerrarlo. Candidato a regla nueva si se repite.

