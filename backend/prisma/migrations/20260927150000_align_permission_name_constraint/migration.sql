-- El value object `Permission` del dominio acepta `namespace:action`
-- donde cada segmento empieza con letra minúscula y admite minúsculas,
-- dígitos y guiones. La restricción original exigía guiones BAJOS y no
-- admitía dígitos, de modo que rechazaba nombres que el dominio
-- considera válidos (`procedural-state:manage`, `case:change-status`) y
-- aceptaba otros que el dominio rechaza (`procedural_state:manage`).
--
-- Ninguna fila existente puede violar la nueva expresión: todo lo que
-- pasaba la anterior y no contiene guión bajo sigue pasando, y la tabla
-- está vacía hasta que corre el seed.
ALTER TABLE "permissions" DROP CONSTRAINT "ck_permissions_name_format";

ALTER TABLE "permissions"
  ADD CONSTRAINT ck_permissions_name_format
  CHECK (name ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$');
