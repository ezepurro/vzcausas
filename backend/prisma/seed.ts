// Este script corre fuera de Nest, así que nadie cargó el `.env` por él.
// Sin esto la conexión falla con un error de SASL que no dice nada sobre
// la causa real.
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Catálogo de roles. Son datos de referencia, no datos de usuario: ningún
 * endpoint los crea en ningún alcance, así que sembrarlos es la única
 * manera de que existan. Sin esto la autenticación tiene éxito y después
 * falla al resolver los roles del usuario, con un 500 que parece un
 * defecto y es una base sin sembrar.
 *
 * Sin `id` explícito a propósito: las columnas son autoincrementales, y
 * fijar los ids en el `create` deja la secuencia de Postgres en cero.
 * El primer alta posterior que no fije el id choca con una clave
 * duplicada.
 */
const ROLES = [
  {
    name: 'ADMINISTRATOR',
    description: 'Administra usuarios, abogados y parametría del estudio.',
  },
  {
    name: 'LAWYER',
    description: 'Abogado del estudio. Opera sobre las causas a su cargo.',
  },
  {
    name: 'SECRETARY',
    description: 'Secretaría del estudio. Apoyo administrativo.',
  },
] as const;

/**
 * Formato `namespace:action`, validado por el value object `Permission`.
 * Se embeben en el claim `permissions[]` del access token, y los lee
 * `PermissionsGuard` en cada petición.
 *
 * Mantener alineada esta lista con los permisos que los endpoints
 * realmente exigen: un permiso que ningún rol otorga vuelve un endpoint
 * inalcanzable para todo el mundo, y el fallo se manifiesta como un 403
 * pelado que no explica nada.
 */
const PERMISSIONS = [
  { name: 'user:create', description: 'Registrar usuarios.' },
  { name: 'user:read', description: 'Consultar usuarios.' },
  { name: 'user:update', description: 'Modificar usuarios.' },
  { name: 'user:delete', description: 'Dar de baja usuarios.' },
  { name: 'lawyer:create', description: 'Registrar abogados.' },
  { name: 'lawyer:read', description: 'Consultar abogados.' },
  { name: 'lawyer:update', description: 'Modificar abogados.' },
  { name: 'lawyer:delete', description: 'Dar de baja abogados.' },
] as const;

/**
 * Todas las operaciones de administración exigen rol `ADMINISTRATOR`
 * según el contrato (§3.2 y §3.3), así que hoy concentra todos los
 * permisos. `LAWYER` y `SECRETARY` quedan sin permisos administrativos
 * hasta que existan los subsistemas de causas y documentos.
 */
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ADMINISTRATOR: PERMISSIONS.map((p) => p.name),
  LAWYER: [],
  SECRETARY: [],
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida. Revisá backend/.env (o el entorno del contenedor).');
}

/**
 * Idempotente por construcción: toda escritura es un upsert sobre una
 * columna única, así que correrlo contra una base ya sembrada no hace
 * nada en vez de fallar por clave duplicada. Importa porque corre en
 * cada despliegue, no solo sobre una base nueva.
 */
/**
 * Fueros del enumerado `Jurisdiction` del contrato (§2). `name` guarda
 * el código, que es lo que lee `JurisdictionMapper`.
 */
const JURISDICTIONS = [
  { name: 'CRIMINAL', dayTypeDefault: 'BUSINESS' },
  { name: 'ADMINISTRATIVE', dayTypeDefault: 'BUSINESS' },
  { name: 'AMPARO', dayTypeDefault: 'BUSINESS' },
] as const;

/**
 * Estados procesales de ejemplo, cinco por fuero, para desarrollo. La
 * tabla definitiva la provee el estudio (RN4, RN5) y se carga desde la
 * API. `name` es única en toda la tabla, por eso no se repite entre
 * fueros. Regla del contrato: `timeLimitDays = 0` ⇔ `dayType = NONE`.
 */
const PROCEDURAL_STATES = [
  // Penal
  {
    jurisdiction: 'CRIMINAL',
    position: 1,
    name: 'Designación de abogado defensor',
    timeLimitDays: 3,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'CRIMINAL',
    position: 2,
    name: 'Declaración del imputado',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'CRIMINAL',
    position: 3,
    name: 'Requerimiento de citación a juicio',
    timeLimitDays: 10,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'CRIMINAL',
    position: 4,
    name: 'Oposición al requerimiento de elevación',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'CRIMINAL',
    position: 5,
    name: 'Sentencia definitiva',
    timeLimitDays: 0,
    dayType: 'NONE',
    terminal: true,
  },
  // Administrativo
  {
    jurisdiction: 'ADMINISTRATIVE',
    position: 1,
    name: 'Notificación de imputación en sumario',
    timeLimitDays: 10,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'ADMINISTRATIVE',
    position: 2,
    name: 'Presentación de descargo',
    timeLimitDays: 10,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'ADMINISTRATIVE',
    position: 3,
    name: 'Apertura a prueba',
    timeLimitDays: 20,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'ADMINISTRATIVE',
    position: 4,
    name: 'Presentación de alegato',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  { jurisdiction: 'ADMINISTRATIVE', position: 5, name: 'Archivada', timeLimitDays: 0, dayType: 'NONE', terminal: true },
  // Amparo
  {
    jurisdiction: 'AMPARO',
    position: 1,
    name: 'Interposición de la acción',
    timeLimitDays: 0,
    dayType: 'NONE',
    terminal: false,
  },
  {
    jurisdiction: 'AMPARO',
    position: 2,
    name: 'Pedido de informe',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'AMPARO',
    position: 3,
    name: 'Contestación del informe',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'AMPARO',
    position: 4,
    name: 'Recurso de apelación',
    timeLimitDays: 3,
    dayType: 'BUSINESS',
    terminal: false,
  },
  { jurisdiction: 'AMPARO', position: 5, name: 'Sentencia firme', timeLimitDays: 0, dayType: 'NONE', terminal: true },
] as const;

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const role of ROLES) {
      await prisma.role.upsert({
        where: { name: role.name },
        // `isSystem` marca los roles de los que depende la aplicación
        // por nombre, para que nada ofrezca eliminarlos más adelante.
        update: { description: role.description, isSystem: true },
        create: {
          name: role.name,
          description: role.description,
          isSystem: true,
        },
      });
    }

    for (const permission of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: {
          name: permission.name,
          description: permission.description,
        },
      });
    }

    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: roleName },
      });

      const permissions = await prisma.permission.findMany({
        where: { name: { in: [...permissionNames] } },
      });

      // Se reemplaza, no se fusiona: las constantes de arriba son la
      // fuente de verdad, así que un permiso que se quita de acá tiene
      // que desaparecer de la base. Fusionando, un permiso revocado
      // sobreviviría para siempre porque nada borraría la fila.
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }

    for (const jurisdiction of JURISDICTIONS) {
      await prisma.jurisdiction.upsert({
        where: { name: jurisdiction.name },
        update: { dayTypeDefault: jurisdiction.dayTypeDefault },
        create: jurisdiction,
      });
    }

    for (const { jurisdiction: code, ...state } of PROCEDURAL_STATES) {
      const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({
        where: { name: code },
      });
      const data = { ...state, jurisdictionId: jurisdiction.jurisdictionId };

      await prisma.proceduralState.upsert({
        where: { name: state.name },
        update: data,
        create: data,
      });
    }

    const roleCount = await prisma.role.count();
    const permissionCount = await prisma.permission.count();
    const jurisdictionCount = await prisma.jurisdiction.count();
    const stateCount = await prisma.proceduralState.count();
    console.log(
      `Seed completado: ${roleCount} roles, ${permissionCount} permisos, ` +
        `${jurisdictionCount} fueros, ${stateCount} estados procesales.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
