-- Contador de intentos fallidos de inicio de sesión (Q-03 de
-- IMPLEMENTACION_AUTH.md, que lo tenía como deuda aceptada).
--
-- Una fila por clave vigilada, no un registro por intento: la política
-- sólo pregunta "cuántos fallos seguidos" y "hasta cuándo está
-- bloqueado", y una fila mutable contesta ambas con un upsert. Un log
-- de intentos es la forma correcta para la auditoría que pide la Ley
-- 25.326 (Q-04), que tiene otra retención y otro consumidor.
--
-- `identifier` es la clave compuesta que arma el adaptador:
--   u:<username>              → red de contención, umbral alto
--   u:<username>|ip:<ip>      → bloqueo primario
--
-- NO es una clave foránea hacia `users`, y eso es deliberado: se cuenta
-- igual contra usuarios que no existen. D-18 responde lo mismo ante un
-- usuario inexistente que ante una contraseña incorrecta para que no se
-- puedan enumerar cuentas; un bloqueo que sólo existiera para usuarios
-- reales devolvería esa distinción ("se bloqueó, entonces existe").
--
-- 120 caracteres alcanzan con margen: 30 del username (límite del value
-- object, C-10) más 45 de una IPv6 en su forma más larga, más los
-- prefijos.
CREATE TABLE "login_attempts" (
    "identifier" VARCHAR(120) NOT NULL,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_failed_at" TIMESTAMPTZ(6) NOT NULL,
    "locked_until" TIMESTAMPTZ(6),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("identifier")
);

-- Para la limpieza por antigüedad. La lectura del login va siempre por
-- la clave primaria, así que este índice no sirve a la ruta caliente.
CREATE INDEX "login_attempts_last_failed_at_idx"
  ON "login_attempts" ("last_failed_at");
