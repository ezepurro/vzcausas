// Este script corre fuera de Nest, así que nadie cargó el `.env` por él.
// Sin esto la conexión falla con un error de SASL que no dice nada sobre
// la causa real.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Role catalog and the permissions each role grants.
 *
 * This is the authoritative definition of the permission matrix. Keep
 * it aligned with the permission strings the endpoints actually
 * require: a permission that no role grants makes an endpoint
 * unreachable for everybody, and the failure surfaces as a bare 403
 * with nothing explaining why.
 *
 * Roles are reference data, not user data — they are not created
 * through the API in any scope, so seeding is the only way they come
 * into existence. Without this, authentication succeeds and then
 * fails resolving the user's roles.
 */
const ROLES: ReadonlyArray<{
  id: number;
  name: string;
  description: string;
  permissions: readonly string[];
}> = [
  {
    id: 1,
    name: "ADMINISTRATOR",
    description: "Socios directores y coordinadores.",
    permissions: [
      "user:manage",
      "lawyer:manage",
      "procedural-state:manage",
      "case:read",
    ],
  },
  {
    id: 2,
    name: "LAWYER",
    description: "Abogados especialistas.",
    permissions: ["case:read", "case:change-status"],
  },
  {
    id: 3,
    name: "SECRETARY",
    description: "Secretaría administrativa.",
    permissions: ["case:read"],
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está definida. Revisá backend/.env (o el entorno del contenedor).",
  );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Idempotent by construction: every write is an upsert keyed on a
 * unique column, so running this against an already-seeded database
 * is a no-op rather than a duplicate-key failure. That matters because
 * it runs on every deploy, not just on a fresh database.
 */
async function main(): Promise<void> {
  const permissionNames = [
    ...new Set(ROLES.flatMap((role) => role.permissions)),
  ];

  const permissionIds = new Map<string, number>();
  for (const name of permissionNames) {
    const permission = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    permissionIds.set(name, permission.id);
  }

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      // `isSystem` marks the roles the application depends on by name,
      // so nothing offers them for deletion later.
      update: { description: role.description, isSystem: true },
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });

    const stored = await prisma.role.findUniqueOrThrow({
      where: { name: role.name },
    });

    // Replace rather than merge: the constant above is the source of
    // truth, so a permission removed from it must disappear from the
    // database too. Merging would let a revoked permission survive
    // forever because nothing would ever delete the row.
    await prisma.rolePermission.deleteMany({ where: { roleId: stored.id } });
    await prisma.rolePermission.createMany({
      data: role.permissions.map((name) => ({
        roleId: stored.id,
        permissionId: permissionIds.get(name)!,
      })),
    });
  }

  const summary = ROLES.map((r) => `${r.name}(${r.permissions.length})`).join(
    ", ",
  );
  console.log(`Seeded ${ROLES.length} roles: ${summary}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
