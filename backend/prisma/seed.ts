import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Datos maestros que el sistema necesita para funcionar. Sin las filas
 * de `roles`, ningún alta de usuario puede completarse: `RegisterUser`
 * resuelve los roles por nombre y, si no encuentra los tres, rechaza la
 * petición con `InvalidRoleError`.
 *
 * Es idempotente (`upsert` por nombre): se puede correr las veces que
 * haga falta sin duplicar nada.
 *
 * Los tres roles son los que fija el enumerado `Role` del contrato de
 * API (§2). El catálogo de permisos, en cambio, va a crecer a medida
 * que aparezcan los demás subsistemas — hoy solo están los de las
 * operaciones que existen.
 */

const ROLES = [
  {
    name: "ADMINISTRATOR",
    description: "Administra usuarios, abogados y parametría del estudio.",
  },
  {
    name: "LAWYER",
    description: "Abogado del estudio. Opera sobre las causas a su cargo.",
  },
  {
    name: "SECRETARY",
    description: "Secretaría del estudio. Apoyo administrativo.",
  },
] as const;

/**
 * Formato `namespace:action`, validado por el value object `Permission`.
 * Se embeben en el claim `permissions[]` del access token (D-06), y los
 * lee `PermissionsGuard` en cada petición.
 */
const PERMISSIONS = [
  { name: "user:create", description: "Registrar usuarios." },
  { name: "user:read", description: "Consultar usuarios." },
  { name: "user:update", description: "Modificar usuarios." },
  { name: "user:delete", description: "Dar de baja usuarios." },
  { name: "lawyer:create", description: "Registrar abogados." },
  { name: "lawyer:read", description: "Consultar abogados." },
  { name: "lawyer:update", description: "Modificar abogados." },
  { name: "lawyer:delete", description: "Dar de baja abogados." },
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

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const role of ROLES) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description, isSystem: true },
        create: { name: role.name, description: role.description, isSystem: true },
      });
    }

    for (const permission of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: { name: permission.name, description: permission.description },
      });
    }

    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: roleName },
      });

      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUniqueOrThrow({
          where: { name: permissionName },
        });

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }

    const roleCount = await prisma.role.count();
    const permissionCount = await prisma.permission.count();
    console.log(
      `Seed completado: ${roleCount} roles, ${permissionCount} permisos.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
