# Reunión con el estudio — demo y relevamiento

**Fecha:** 30/10/2026 · **Objetivo:** mostrar la app y salir con decisiones sobre costos,
Drive, notificaciones, permisos y lo que falta construir.

**El estudio, en números** (`ARQUITECTURA_BACKEND_V1.md:120`): **9 personas** y entre
**100 y 150 causas activas**. Todos los cálculos de abajo salen de ahí.

> Precios de fines de octubre de 2026, en dólares, que es como cobran los proveedores, y
> **sin** los impuestos a servicios digitales de Argentina. Salen de páginas oficiales y de
> comparativas recientes, que a veces no coinciden: marco con *(verificar)* lo que no pude
> confirmar en la fuente oficial. Confirmar antes de contratar.

---

## 0. Checklist antes de la demo

- [ ] Rama `feat/seed-demo`, con **una base nueva**, migrada y con el seed corrido **un día
      hábil**. Si se corre un sábado o un domingo, los vencimientos quedan corridos un día.
- [ ] Frontend con `VITE_USE_MOCKS=false`. Si no, se ven los datos del mock (`fvazquez`).
- [ ] Usuarios para la demo (contraseña `admin123`): `g.sosa` (Administradora y abogada),
      `f.arias` (abogada), `m.godoy` (secretaria) y `admin`.
- [ ] **Cosas que se van a ver y conviene evitar o anticipar:**
  - En el alta de usuario, el campo de email muestra como ejemplo
    `apellidoNombre@vazquezzarate.com` (`UserFormModal.tsx:73`).
  - El ítem **"Reportes"** del menú lleva a "página no encontrada" y la **campana** de
    notificaciones no hace nada.
  - El **expediente y la carátula** están en `develop` (`2f3b1ac`), no en `main`.
- [ ] Recorrido sugerido:
  1. Inicio: tableros "Mi día" y "Estudio".
  2. Listado de causas y filtros.
  3. Detalle de una causa penal con prescripción (MANSILLA) y su línea de vida.
  4. Registrar un acto procesal y ver cómo cambian el estado y el vencimiento.
  5. Modelos: subir uno.
  6. Registrar una causa con "Crear carpeta" y "Copiar modelos" marcadas, y abrir la
     carpeta en Drive.
- [ ] Llevar **impresa la matriz de permisos** (§4) para que la completen ahí.

---

## 1. Hosting

### Qué importa para el rendimiento en este caso

Con 9 usuarios y 150 causas, **cualquier servidor de 1 a 2 GB de RAM sobra**. La potencia
no es lo que va a notar el estudio. Lo que sí se nota es esto:

1. **La distancia al servidor (latencia).**
   - Cada pantalla hace varios pedidos al servidor, y cada uno va y vuelve.
   - Desde Córdoba, un servidor en **São Paulo** responde en unos **30-50 ms** por pedido;
     uno en **Estados Unidos**, en unos **130-170 ms**. Son estimaciones: lo ideal es medirlo
     con un servidor de prueba.
   - En una pantalla con 4 o 5 pedidos, Estados Unidos suma **entre medio segundo y un
     segundo**. No impide trabajar, pero se siente.
2. **Que el servidor no se "duerma".**
   - Los planes gratis y los que "escalan a cero" apagan la app cuando nadie la usa.
   - Entonces el primer pedido del día tarda **entre 5 y 30 segundos**, y parece que la app
     no anda.
   - Para un estudio que entra a la mañana, conviene un servidor siempre prendido.
3. **La base de datos en la misma región que el backend.**
   - Si están separados, cada consulta suma latencia.
4. **Backups automáticos.**
   - No es rendimiento, pero es lo que más duele si falta.

Drive y Gmail responden igual con cualquier hosting, porque esas llamadas van a Google.

### Alternativas

**Lo que hay hoy:**
- el frontend preparado para Vercel (`frontend/vercel.json`);
- el backend en Docker;
- falta dónde poner la base;
- el proceso diario lo dispara GitHub Actions, que es gratis.

| Opción | Región más cercana | Costo mensual aprox. | Rendimiento para el estudio | Mantenimiento | Comentario |
| --- | --- | --- | --- | --- | --- |
| **AWS Lightsail** (servidor + base administrada) | **São Paulo** | Servidor de 2 GB ~US$ 12 + base ~US$ 15 = **~US$ 27** *(verificar el precio en São Paulo)* | **Muy bueno**: cerca y siempre prendido | Bajo: Docker y backups con un clic | Lo más simple dentro de Amazon. Con la base en el mismo servidor baja a **~US$ 12**, pero los backups quedan a cargo nuestro |
| **AWS EC2 + RDS** (lo "profesional" de Amazon) | **São Paulo** | EC2 t4g.small ~US$ 20 + RDS micro ~US$ 19 + disco e IP ≈ **US$ 45-50** *(verificar RDS)* | **Muy bueno** | Medio: hay que armar red, permisos y alarmas | Sobra para 9 personas. Tiene sentido si después crecen o si quieren todo en AWS. São Paulo sale ~60 % más caro que Estados Unidos. Las cuentas nuevas reciben **US$ 100-200 de crédito** por 6 meses |
| **Google Cloud** (Cloud Run + Cloud SQL) | **São Paulo** | Cloud SQL micro ~US$ 8-10 + disco; Cloud Run casi gratis si se apaga, **~US$ 10-15 en total**. Siempre prendido, **~US$ 25-35** *(verificar)* | Bueno si queda siempre prendido; si se apaga, el primer pedido tarda | Medio | Mismo proveedor que Drive y Gmail. Si se apaga para ahorrar, aparecen las demoras del punto 2 |
| **Azure** (App Service + PostgreSQL) | **São Paulo** (Brazil South) | Base B1ms **~US$ 26** + App Service ~US$ 13-20 = **~US$ 40-45** | Muy bueno | Medio | Lo más caro de los grandes para este tamaño |
| **Fly.io** | **São Paulo** (GRU) | **US$ 10-23**, según use base administrada o propia | Muy bueno | Medio | Barato y cerca. Ya no tiene plan gratis |
| **Render** | Estados Unidos (no tiene Sudamérica) | Servicio US$ 7 + base ~US$ 6 = **~US$ 13-14** | Bueno, con la demora de la distancia | **Muy bajo**: se conecta al repositorio y listo | Lo más fácil de operar. El plan pago no se duerme |
| **Railway** | Estados Unidos | **US$ 10-15** según uso | Bueno, con la demora de la distancia | Muy bajo | El costo varía mes a mes |
| **VPS Hetzner** (todo en un servidor) | Estados Unidos o Europa | **~€ 4-8** | Bueno o regular según la región | **Alto**: actualizaciones, seguridad y backups a cargo nuestro | Lo más barato pagando, pero alguien lo tiene que mantener |
| **Oracle Cloud "Always Free"** | São Paulo o Vinhedo | **US$ 0** | Bueno mientras funcione | Alto | **No para producción**: Oracle recortó el plan gratis en junio de 2026 y puede recuperar servidores sin uso |
| **Una PC en el estudio** | En la oficina | US$ 0 en hosting | Excelente adentro de la oficina; desde afuera, depende del internet del estudio | **Alto** | Depende de la luz, del internet y de que nadie la apague. Los backups fuera del estudio quedan a cargo nuestro |

**Frontend:**
- El plan gratis de **Vercel no permite uso comercial**; el pago cuesta **US$ 20 por usuario y
  por mes**.
- **Alternativas gratis:**
  - Cloudflare Pages, sin límite de uso comercial;
  - S3 + CloudFront, si se elige AWS, por menos de US$ 1 al mes;
  - servirlo desde el mismo backend.

**Dominio propio** (`.com.ar`): se paga por año en NIC Argentina.

### Resumen para la reunión

| Prioridad del estudio | Recomendación | Costo aprox. |
| --- | --- | --- |
| **Calidad y respaldo de una marca conocida** | AWS Lightsail en São Paulo, con base administrada | **~US$ 27/mes** |
| **Mejor precio sin perder rendimiento** | Fly.io en São Paulo, o Lightsail con la base en el mismo servidor | **US$ 12-23/mes** |
| **Lo más simple de mantener para el equipo** | Render, en Estados Unidos | **~US$ 14/mes** |
| **Crecimiento a futuro / todo en un proveedor grande** | AWS EC2 + RDS en São Paulo | **~US$ 45-50/mes** |

**Preguntar:**
- ¿Quién paga y a nombre de quién quedan las cuentas? Conviene que sean del estudio.
- ¿Quién mantiene el sistema cuando termine el seminario?
- ¿Van a usar la app desde fuera del estudio?
- ¿Cada cuánto quieren backups?
- ¿Quieren un dominio propio?

---

## 2. Avisos de vencimiento: cuánto cuesta WhatsApp de verdad

### Lo que hay hoy (US$ 0)

- **Un correo por día** a la casilla de gestión y una copia a cada abogado, solo con sus
  causas.
- Avisa en cuatro momentos: 3 días hábiles antes del vencimiento, el día que vence, cuando
  una causa penal llega al 70 % de la prescripción y cuando la prescripción se cumple.
- Corre a las 08:00 (`API_CONTRACT_V4.md:7037-7047`).
- Los avisos van todos juntos en un solo correo y se mandan desde la cuenta de Gmail del
  estudio, así que **no cuestan nada**.

### Cómo cobra WhatsApp (API oficial de Meta)

- **Se paga cada mensaje entregado.** Un aviso automático es un mensaje de **"utilidad"**: a un
  número argentino cuesta **US$ 0,026** (tarifa desde el 01/10/2026).
- **Desde octubre de 2026 se cobran todos.** Antes, los mensajes dentro de las 24 horas de una
  respuesta del usuario eran gratis. Los 1.000 mensajes gratis por mes son solo de
  *atención*, no de avisos automáticos.
- **Cada mensaje sale de una plantilla que Meta tiene que aprobar**, y la plantilla tiene un
  límite de **1.024 caracteres**. Un resumen con muchas causas **no entra en un solo
  mensaje**: hay que partirlo, y cada parte se cobra.
- **Si se usa un intermediario** (Twilio u otro), suma entre **15 y 25 %**. Con la API de Meta
  directa no hay recargo, pero hay más desarrollo.
- **Hace falta un número propio dedicado** que no se use en el WhatsApp común, y verificar el
  negocio en Meta.
- **Meta cambia las tarifas** varias veces por año: la última fue el 01/10/2026.

### Cálculo con el estudio real

**Supuestos:**
- 150 causas activas;
- cada causa abre en promedio **1,5 plazos por mes** (un acto nuevo cada 3 semanas);
- cada plazo genera **2 avisos**: el preaviso y el día del vencimiento;
- cada aviso va a **2 personas**: el abogado y la casilla de gestión;
- 7 abogados con causas;
- 22 días hábiles por mes.

| Escenario | Qué recibe cada uno | Mensajes por mes | Costo por mes | Costo por año |
| --- | --- | ---: | ---: | ---: |
| **A. Un resumen por día**, igual que el correo | Cada abogado, un mensaje con sus causas; gestión, 2 mensajes por día, porque todo junto no entra | ~198 | **US$ 5** | **US$ 62** |
| **B. Un mensaje por cada aviso**, que es lo natural en WhatsApp | Cada vencimiento, su propio mensaje, al abogado y a gestión | ~910 | **US$ 24** | **US$ 284** |
| **C. B + recordatorio diario de los vencidos** hasta que se registre un acto, con unos 15 vencidos abiertos en promedio | Lo de B, más un recordatorio por día por cada vencido | ~1.570 | **US$ 41** | **US$ 490** |
| **D. Uso intenso**: 3 avisos por plazo (5 días antes, 1 día antes y el día) + C, con 2,5 plazos por causa al mes | Lo de C, con más avisos y más actividad | ~2.920 | **US$ 76** | **US$ 911** |

- Con **100 causas** en vez de 150, el escenario B baja a unos **US$ 16 por mes**.
- **Con intermediario**, sumar entre 15 y 25 %: el escenario C pasa a unos **US$ 47-51 por mes**.
- **Conclusión:**
  - Si se replica el correo (escenario A), sale casi nada.
  - Si se usa como se usa WhatsApp, un mensaje por aviso y recordatorios (escenarios B a D),
    va de **US$ 24 a 76 por mes**, entre 2 y 5 veces lo que cuesta el hosting.
  - A eso se suma el desarrollo: plantillas, alta en Meta y manejo de errores.

### Comparación de medios

| Medio | Costo por mes para el estudio | Se lee | Desarrollo |
| --- | --- | --- | --- |
| **Correo** (ya está) | **US$ 0** | Se puede perder entre otros correos | Hecho |
| **Tablero de la app** (ya está) | **US$ 0** | Solo si entran | Hecho |
| **WhatsApp** | **US$ 5 a 76**, según el escenario | **El que más se lee** | Nuevo: alta en Meta, plantillas, número propio |
| **SMS** (Twilio, ~US$ 0,10 cada uno) | Escenario B: **~US$ 91** | Bien, pero sin formato | Nuevo |
| **Telegram** | **US$ 0** | Bien, si lo usan | Nuevo, y todos tienen que instalarlo |

**Propuesta:** seguir con correo y tablero. Si quieren WhatsApp:
- empezar por el **escenario A**, un resumen por día, que cuesta unos US$ 5 por mes;
- o usarlo **solo para lo urgente**, el día del vencimiento y los vencidos.

**Preguntar:**
- ¿Leen el correo a diario?
- ¿Quieren WhatsApp para todo o solo para lo urgente?
- ¿A quién le tiene que llegar?
- ¿Hay presupuesto mensual para esto?

---

## 3. Google: la cuenta común que tienen hoy, o Workspace

### Cómo está hecho hoy

**El diseño** (`ADR-003_GOOGLE_DRIVE.md:30-32`):
- una **cuenta de Gmail común**, la de gestión, es dueña de todo en Drive y manda los
  correos;
- comparte la carpeta raíz con la cuenta de Google de cada abogado.

**Cómo accede la app:** con el permiso de una sola autorización y los alcances `drive.file`
y `gmail.send`.

### Alternativas

| | **Gmail común** (hoy) | **Gmail común + Google One** | **Workspace solo para gestión** (1 usuario) | **Workspace para todo el estudio** (9 usuarios) |
| --- | --- | --- | --- | --- |
| **Costo** | US$ 0 | 100 GB: **US$ 1,99/mes** (~$ 29.885 por año). 2 TB: **US$ 9,99/mes** (~$ 149.485 por año) | **US$ 7/mes** con pago anual (US$ 84 por año) o **US$ 8,40** mes a mes, más el dominio | **US$ 63/mes** con pago anual (US$ 756 por año) o **US$ 75,60** mes a mes, más el dominio |
| **Espacio** | 15 GB, compartidos con Gmail y Fotos | 100 GB o 2 TB | 30 GB | 30 GB por usuario, compartidos: **270 GB** |
| **Correo** | `estudio@gmail.com` | Igual | `gestion@estudio.com.ar` | Todos con `@estudio.com.ar` |
| **Quién es dueño de los archivos** | La cuenta personal: si alguien pierde la contraseña o se va, hay riesgo | Igual | **El estudio**, como organización | **El estudio**, con unidades compartidas: un archivo no es de una persona |
| **Seguridad** | La que configure quien tiene la cuenta | Igual | Verificación en dos pasos obligatoria, recuperación por el administrador, registro de actividad | Lo mismo, para todos |
| **Soporte de Google** | No | No | Sí | Sí |
| **Envío de correos** | Límite diario de una cuenta común, que sobra para un resumen por día | Igual | Límite más alto | Límite más alto |
| **Rendimiento en la app** | Igual en todas: la app usa la misma API de Drive | Igual | Igual | Igual |
| **Cambios en la app** | Ninguno | Ninguno | **Ninguno**: se autoriza la cuenta de gestión de Workspace en lugar de la de Gmail | **Ninguno** obligatorio. Más adelante se podrían usar unidades compartidas |

**Una ventaja de Workspace que nos resuelve un problema técnico:**
- con Workspace, la app de Google se registra como **"interna"**;
- una app interna **no necesita que Google la verifique** y su autorización **no vence a los
  7 días**;
- con la cuenta común, en cambio, hay que publicar la app y aceptar la pantalla de "app no
  verificada" (`ADR-004_EMAIL_GMAIL_API.md:62`, `:120`).

**Lo que hay que configurar en Workspace:**
- permitir que la app acceda (controles de API del administrador);
- si los abogados siguen con su Gmail personal, permitir compartir con cuentas de afuera.

**Recomendación:**
- **Si el presupuesto es cero:** seguir con la cuenta común y sumar Google One de 100 GB cuando
  no alcance el espacio.
- **Si pueden pagar unos US$ 7 por mes: Workspace solo para la cuenta de gestión.** Es la
  mejor relación calidad-precio:
  - la información queda a nombre del estudio y no de una persona;
  - tienen correo con dominio propio y soporte de Google;
  - la integración queda más firme;
  - los abogados pueden seguir con su Gmail.
- **Workspace para los 9** tiene sentido solo si además quieren el correo de todos con el
  dominio del estudio.

**Preguntar:**
- ¿De quién es hoy la cuenta común? ¿Quién tiene la contraseña?
- ¿Cuánto espacio usan hoy en documentos?
- ¿Quieren correo con dominio propio?
- ¿Cada abogado tiene cuenta de Google? Hace falta para compartirles las carpetas
  (`ADR-003_GOOGLE_DRIVE.md:117`).

---

## 4. Matriz de permisos — para que la completen

**Cómo se completa:**
- ● **puede hacerlo**;
- ◐ **solo en sus propias causas**;
- ○ (dejarlo vacío) **no puede**.

Las columnas son los cuatro roles que relevó el estudio inicial. Hoy la app tiene tres
perfiles, y los coordinadores están dentro de Administrador (P-06).

| Funcionalidad | Socio director | Coordinador | Abogado | Secretaría |
| --- | :---: | :---: | :---: | :---: |
| **Acceso** | | | | |
| Iniciar sesión y cambiar su contraseña | ○ | ○ | ○ | ○ |
| **Usuarios y abogados** | | | | |
| Ver usuarios | ○ | ○ | ○ | ○ |
| Crear, modificar y dar de baja usuarios | ○ | ○ | ○ | ○ |
| Asignar perfiles a los usuarios | ○ | ○ | ○ | ○ |
| Ver abogados y su carga de causas | ○ | ○ | ○ | ○ |
| Registrar, modificar y dar de baja abogados | ○ | ○ | ○ | ○ |
| **Clientes** | | | | |
| Ver clientes | ○ | ○ | ○ | ○ |
| Registrar clientes | ○ | ○ | ○ | ○ |
| Modificar clientes | ○ | ○ | ○ | ○ |
| Dar de baja clientes | ○ | ○ | ○ | ○ |
| **Causas** | | | | |
| Ver todas las causas del estudio (listado y detalle) | ○ | ○ | ○ | ○ |
| Ver solo sus propias causas | ○ | ○ | ○ | ○ |
| Registrar causas | ○ | ○ | ○ | ○ |
| Modificar los datos de una causa | ○ | ○ | ○ | ○ |
| Cambiar el abogado responsable (reasignar) | ○ | ○ | ○ | ○ |
| Dar de baja una causa | ○ | ○ | ○ | ○ |
| Ver la línea de vida de la causa | ○ | ○ | ○ | ○ |
| **Actos y plazos** | | | | |
| Registrar actos procesales | ○ | ○ | ○ | ○ |
| Modificar o anular un acto procesal | ○ | ○ | ○ | ○ |
| Ajustar a mano un vencimiento | ○ | ○ | ○ | ○ |
| Registrar actos interruptivos (penal) | ○ | ○ | ○ | ○ |
| Marcar una causa como prescripta | ○ | ○ | ○ | ○ |
| Adjuntar documentos al registrar un acto | ○ | ○ | ○ | ○ |
| **Documentos y Drive** | | | | |
| Abrir la carpeta de la causa en Drive | ○ | ○ | ○ | ○ |
| Crear o reintentar la carpeta de la causa | ○ | ○ | ○ | ○ |
| Ver los documentos de la causa | ○ | ○ | ○ | ○ |
| Subir documentos a la causa | ○ | ○ | ○ | ○ |
| Ver y descargar modelos | ○ | ○ | ○ | ○ |
| Subir, modificar y dar de baja modelos | ○ | ○ | ○ | ○ |
| Generar la carátula | ○ | ○ | ○ | ○ |
| Generar el expediente | ○ | ○ | ○ | ○ |
| **Parámetros del estudio** | | | | |
| Ver estados procesales y plazos | ○ | ○ | ○ | ○ |
| Crear, modificar y dar de baja estados procesales | ○ | ○ | ○ | ○ |
| Ver calificaciones legales | ○ | ○ | ○ | ○ |
| Crear, modificar y dar de baja calificaciones legales | ○ | ○ | ○ | ○ |
| Cargar feriados y días inhábiles | ○ | ○ | ○ | ○ |
| Configurar los avisos (días de preaviso, hora, a quién) | ○ | ○ | ○ | ○ |
| **Avisos, tableros y reportes** | | | | |
| Recibir avisos de vencimiento de sus causas | ○ | ○ | ○ | ○ |
| Recibir avisos de vencimiento de todo el estudio | ○ | ○ | ○ | ○ |
| Recibir alertas de prescripción | ○ | ○ | ○ | ○ |
| Tablero "Mi día" (sus causas) | ○ | ○ | ○ | ○ |
| Tablero "Estudio" (todas las causas y la carga del equipo) | ○ | ○ | ○ | ○ |
| Ver reportes y estadísticas | ○ | ○ | ○ | ○ |
| Exportar reportes (Excel o PDF) | ○ | ○ | ○ | ○ |
| **Herramientas** | | | | |
| Accesos directos a sitios externos | ○ | ○ | ○ | ○ |

**Para nosotros: cómo está hoy** (`API_CONTRACT_V4.md:6809-6828`):
- ✓ = puede;
- ¹ = solo el abogado responsable de la causa;
- "Administrador" incluye a socios y coordinadores.

| Funcionalidad | Administrador | Abogado | Secretaría |
| --- | :---: | :---: | :---: |
| Sesión y contraseña | ✓ | ✓ | ✓ |
| Administrar usuarios | ✓ | — | — |
| Clientes | ✓ | ✓ | ✓ |
| Ver abogados | ✓ | ✓ | ✓ |
| Registrar, modificar y dar de baja abogados | ✓ | — | — |
| Estados procesales y calificaciones legales | ✓ | ✓ | ✓ |
| Causas: alta, consulta, detalle, carátula, expediente y baja | ✓ | ✓ | ✓ |
| Actos procesales e interruptivos | — | ✓ ¹ | — |
| Recibir avisos | ✓ | ✓ | — |
| Modelos formales | ✓ | ✓ | — |
| Documentos de la causa | — | ✓ | ✓ |
| Carpeta y modelos en Drive | ✓ | ✓ | ✓ |
| Tablero "Mi día" | — | ✓ | — |
| Tablero "Estudio" y reportes | ✓ | — | — |

**Para comparar con lo que marquen:**
- **Hoy todos ven todas las causas** (RN11). Si alguien marca "Ver solo sus propias causas",
  es un cambio de regla importante.
- **Un administrador que no es abogado no puede registrar actos.** Si los coordinadores tienen
  que poder hacerlo, cambia D-30.

---

## 5. La aplicación — preguntas con contexto

### Cómo ordenar las carpetas de las causas
- **Hoy:** `VZ Causas/Causas/{Apellido, Nombre del abogado}/{Fuero}/{carátula}`.
- **Alternativas:**
  - por fuero primero;
  - por año;
  - por cliente;
  - agregar el SAC al nombre.
- **Ojo:** si la carpeta cuelga del abogado, reasignar una causa obliga a mover la carpeta
  (P-05).
- **Preguntar:** ¿cómo las ordenan hoy? ¿Buscan por abogado, por cliente o por SAC?

### Cómo ordenar los modelos
- **Hoy:**
  - van en una sola carpeta, `VZ Causas/Modelos formales/`, cada uno con sus fueros y la
    casilla "Copiar en las causas nuevas";
  - en la carpeta de la causa quedan sueltos.
- **Alternativas:**
  - subcarpetas por fuero;
  - un prefijo numérico para ordenarlos;
  - una subcarpeta "Modelos" dentro de la causa.
- **Preguntar:** ¿cuántos modelos tienen por fuero? ¿Cómo los nombran?

### Subir los modelos y que se copien solos (mostrar en vivo)
- **Hoy:**
  - se suben en `.docx`, de hasta 10 MB;
  - se copian al registrar una causa de su fuero;
  - las causas que ya existían no los reciben (CA-34.5);
  - si después se cambia el modelo, la copia ya hecha no cambia.
- **Preguntar:**
  - ¿Quieren poder mandar un modelo nuevo a las causas que ya existen?
  - ¿Algunos modelos tendrían que copiarse recién al llegar a cierto estado procesal?
  - ¿Quieren que el modelo se complete solo con los datos de la causa? Esto último es
    trabajo grande.

### Validar los formularios — llevar impresa la lista de campos
**Causa:**
- Fuero, rol procesal y cliente.
- Carátula: se sugiere sola (`suggestedCaption.ts`) y se puede editar.
- Abogado responsable.
- SAC: opcional; si se carga, son 8 dígitos y obliga a cargar la fecha de inicio.
- Juzgado e instructor: nombre, teléfono e interno.
- Tasa de justicia pagada.
- Según el fuero:
  - **Penal:** calificaciones legales con la fecha del hecho de cada una, y si el cliente
    está preso.
  - **Administrativo:** contraparte, objeto del reclamo y fecha de agotamiento de la vía.
  - **Amparo:** contraparte, objeto, medida cautelar y acto lesivo (fecha, si se renueva y
    el plazo).

**Cliente:** apellido, nombre, DNI (8 dígitos, sin puntos), teléfono y email.

**Preguntar en cada campo:** ¿es obligatorio? ¿Sobra? ¿Falta alguno (domicilio, CUIT,
fiscalía, número de expediente o de sumario)?

### Subir documentos al registrar un acto procesal, que vayan solos a Drive
- **Hoy:** no existe. Es trabajo nuevo.
- **Preguntar:**
  - ¿Qué suben y en qué formato?
  - ¿De qué tamaño?
  - ¿Cómo tiene que llamarse el archivo?
  - ¿Va a la carpeta de la causa o a una subcarpeta por acto?
  - ¿Tiene que entrar en el expediente?

### Generar el expediente a partir de los documentos
- **Hoy:** la pantalla está en `develop` (`2f3b1ac`). Del lado del backend falta decidir
  dónde vive la generación (P-08).
- **Preguntar:**
  - ¿Qué documentos entran y en qué orden?
  - ¿Un solo PDF, con índice y foliatura?
  - ¿Para imprimir, para presentar o solo para archivo?

### La carátula (página del expediente)
- **Preguntar:**
  - ¿Qué datos lleva?
  - ¿Tienen un modelo que usen hoy? Pedirlo.
  - ¿Lleva logo o membrete?
  - ¿Es la misma para los tres fueros?

### Si el título de la causa está bien armado
- **Hoy se sugiere así:**
  - **Penal:** `APELLIDO, Nombres p.s.a. Delito y Delito`.
  - **Amparo:** `APELLIDO, Nombres c/ Contraparte — Amparo`.
  - **Administrativo:** `APELLIDO, Nombres — Contraparte · Sumario administrativo`.
- **Preguntar:**
  - ¿Es como figura en el SAC?
  - En un querellante particular, la carátula lleva el nombre del imputado, no el del
    cliente. ¿Cómo la arman?
  - ¿Lleva el número de expediente o de sumario?

### Cada cuánto quieren los avisos de vencimiento
- **Hoy:** 3 días hábiles antes y el mismo día, a las 08:00. Un vencimiento ya pasado **no**
  vuelve a avisarse.
- **Preguntar:**
  - ¿3 días alcanzan, o prefieren varios avisos (5 días antes, 1 día antes y el mismo día)?
  - ¿Está bien la hora?
  - ¿Quieren que un plazo vencido siga avisando todos los días? Esto cambia el costo de
    WhatsApp (§2).
  - ¿Les sirve un resumen semanal?

### Reportes y estadísticas
- **Hoy:** los tableros "Mi día" y "Estudio". "Reportes" todavía no existe.
- **Propuestas:**
  - causas por abogado, por fuero y por estado;
  - causas nuevas y cerradas por mes;
  - vencimientos cumplidos y vencidos;
  - cuánto tarda en promedio cada etapa;
  - prescripciones próximas;
  - clientes con más causas;
  - exportar a Excel o PDF.
- **Preguntar:** ¿qué miran hoy para saber cómo va el estudio? ¿Lo usan para repartir el
  trabajo o para los honorarios?

### Feriados (hoy solo se descuentan los fines de semana)
- **Hoy:** a propósito no se descuentan feriados ni la feria judicial (P-02).
- **Opciones:**
  1. **El estudio carga los días inhábiles**, por año y cuando aparece uno extraordinario.
     Cubre la feria, los asuetos y los feriados que se decretan de un día para el otro.
     **Propuesta.**
  2. **Precarga de los feriados nacionales** desde un calendario público, más la carga manual
     de los extraordinarios.
  3. **Solo una fuente externa.** No cubre los asuetos del Poder Judicial de Córdoba ni los
     feriados decretados sobre la marcha.
- **Preguntar:**
  - ¿Quién los cargaría?
  - ¿Siguen las acordadas del TSJ de Córdoba?
  - ¿La feria corre para los tres fueros?
  - ¿En lo administrativo los días hábiles son los mismos?
  - Si se carga un feriado nuevo, ¿hay que recalcular los vencimientos ya abiertos?

---

## 6. Preguntas propuestas

**Pendientes de definición del proyecto** (`PENDIENTE_DEFINICION.md`):

1. **P-04 · Fuero administrativo:** si todavía no llegó la notificación, ¿se registra el
   acto con el vencimiento pendiente, o se espera a tener la fecha?
2. **P-05 · Baja de un abogado:** ¿qué pasa con sus causas? ¿Hay que reasignarlas antes, pasan
   a un administrador o quedan sin responsable?
3. **P-06 · Coordinadores:** ¿tienen que administrar usuarios, o necesitan un perfil propio?
   La matriz del §4 lo responde.

**Datos y carga inicial:**

4. ¿Cuántas causas vigentes tienen y dónde están (Excel, papel, otro sistema)? ¿Hay que
   migrarlas? ¿Quién las carga?
5. **Tabla definitiva de estados procesales y plazos** de cada fuero (RN4, RN5): ¿quién la
   pasa y cuándo?
6. **Calificaciones legales** con su plazo de prescripción: ¿las cargan ellos o nos pasan
   la lista?
7. En cada estado, ¿el plazo corre en días hábiles o corridos?

**Operación diaria:**

8. ¿Van a usar la app desde el celular o desde fuera del estudio?
9. Cuando se da de baja una causa, ¿registran el motivo? ¿Necesitan ver las causas dadas de
   baja?

**Datos personales y responsabilidad:**

10. La app guarda datos de clientes (DNI, teléfono, correo). ¿Algún requisito de
    confidencialidad o de datos personales (Ley 25.326)?
11. ¿Quién es dueño de las cuentas (Google, hosting, dominio) y quién tiene acceso de
    administrador?

**Cierre:**

12. De lo que vieron, ¿qué es lo primero que usarían y qué les falta para el día a día?
13. ¿Quieren un acceso directo al portal del Poder Judicial o al SAC desde la causa?
14. ¿Cómo prefieren la capacitación y el soporte después de la entrega?

---

## Fuentes

- **Hosting:**
  - AWS Lightsail: [stackrates.ai](https://stackrates.ai/hosting/aws-lightsail/),
    [docs.aws.amazon.com](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-data-transfer-allowance.html)
  - EC2 en São Paulo: [devzero.io](https://www.devzero.io/instances/aws/t4g.small)
  - Plan gratis de AWS: [builder.aws.com](https://builder.aws.com/content/3Kkt4kNiDSUnO3n6db2weSNubzE/the-dollar0-aws-account-in-2026-free-plan-credits-guardrails)
  - Google Cloud: [docs.cloud.google.com](https://docs.cloud.google.com/free/docs/free-cloud-features),
    [nightsongcloud.com](https://www.nightsongcloud.com/gcp-cheap-database)
  - Azure: [bytebase.com](https://www.bytebase.com/dbcost/azure-flexible/instance/B1ms/)
  - Oracle: [infoq.com](https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/)
  - Render, Railway y Fly.io: [prisma.io](https://www.prisma.io/blog/app-hosting-platforms-with-managed-postgres-2026),
    [devtoolpicks.com](https://devtoolpicks.com/blog/railway-vs-render-vs-fly-io-solo-developers-2026),
    [expresstech.io](https://expresstech.io/render-vs-railway-vs-fly-io-2026-pricing-showdown/)
  - VPS: [cloudmart.dev](https://cloudmart.dev/blog/cheapest-vps-2026)
  - Latencia: [economize.cloud](https://www.economize.cloud/resources/aws/latency/sa-east-1-vs-us-east-1/)
- **WhatsApp:**
  - Tarifas: [sleekflow.io](https://sleekflow.io/blog/whatsapp-business-price),
    [whatsapppilot](https://whatsapppilot.esafqa.com/blog/whatsapp-business-api-pricing-explained)
  - Cambio de octubre de 2026: [respond.io](https://respond.io/blog/whatsapp-pricing-change-2026.md)
  - Recargo de los intermediarios: [martechcost.com](https://martechcost.com/whatsapp-pricing/argentina)
- **SMS:** [twilio.com](https://www.twilio.com/en-us/sms/pricing/ar)
- **Google:**
  - Workspace: [workspace.google.com/pricing](https://workspace.google.com/pricing.html),
    [eesel.ai](https://www.eesel.ai/blog/google-workspace-pricing)
  - Espacio compartido de Workspace: [knowledge.workspace.google.com](https://knowledge.workspace.google.com/admin/storage/)
  - Google One en pesos: [rosario3.com](https://www.rosario3.com/tecnologia/google-comenzo-a-pesificar-los-precios-de-sus-servicios-y-aplicaciones-en-argentina-20261001-0033.html)
  - Vencimiento de la autorización en *Testing*: [unipile.com](https://www.unipile.com/google-oauth-refresh-token/)
