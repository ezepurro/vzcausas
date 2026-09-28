-- Un abogado tiene como máximo una cuenta de usuario ACTIVA.
--
-- Índice parcial y no un UNIQUE a secas: dar de baja una cuenta libera
-- la matrícula, porque el abogado sigue ejerciendo y solo cambió de
-- cuenta. Con un UNIQUE común, el primer usuario dado de baja dejaría a
-- ese abogado sin poder tener acceso nunca más.
--
-- La condición `lawyer_id IS NOT NULL` no hace falta para la corrección
-- —Postgres no considera iguales dos NULL en un índice único— pero deja
-- fuera a la mayoría de las filas, que son los usuarios sin abogado.
--
-- ATENCIÓN: Prisma no sabe expresar índices parciales en schema.prisma.
-- El próximo `prisma migrate dev` lo va a ver como deriva y va a querer
-- eliminarlo. Si aparece un DROP INDEX de este índice en una migración
-- generada, hay que sacarlo a mano. Está anotado también en el modelo.
CREATE UNIQUE INDEX "users_lawyer_id_active_key"
  ON "users" ("lawyer_id")
  WHERE "active" = true AND "lawyer_id" IS NOT NULL;
