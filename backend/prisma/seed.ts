// Este script corre fuera de Nest, así que nadie cargó el `.env` por él.
// Sin esto la conexión falla con un error de SASL que no dice nada sobre
// la causa real.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
 * Se embeben en el claim `permissions[]` del access token, y los lee
 * `PermissionsGuard` en cada petición.
 *
 * Mantener alineada esta lista con los permisos que los endpoints
 * realmente exigen: un permiso que ningún rol otorga vuelve un endpoint
 * inalcanzable para todo el mundo, y el fallo se manifiesta como un 403
 * pelado que no explica nada.
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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error(
		"DATABASE_URL no está definida. Revisá backend/.env (o el entorno del contenedor).",
	);
}

/**
 * Idempotente por construcción: toda escritura es un upsert sobre una
 * columna única, así que correrlo contra una base ya sembrada no hace
 * nada en vez de fallar por clave duplicada. Importa porque corre en
 * cada despliegue, no solo sobre una base nueva.
 */
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

		for (const [roleName, permissionNames] of Object.entries(
			ROLE_PERMISSIONS,
		)) {
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
