import { getPrisma } from './test-app';

/**
 * Vacía `audit_log`. La tabla es de solo alta: un trigger rechaza DELETE y
 * TRUNCATE (`trg_audit_log_append_only`), salvo dentro de una transacción que
 * active `vzcausas.audit_purge`. Esa puerta existe justamente para los tests
 * (migración `20261031195859_sprint4_manual_constraints`).
 *
 * Hace falta antes de borrar usuarios: `audit_log.actor_user_id` los referencia
 * con `Restrict`, así que un spec que audita y no limpia deja a los demás sin
 * poder hacer `user.deleteMany()`.
 */
export async function purgeAuditLog(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL vzcausas.audit_purge = 'on'`),
    prisma.auditLog.deleteMany(),
  ]);
}
