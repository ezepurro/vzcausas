# Cambios de `deadlines`

## La campana dispara la corrida diaria (sólo en local)

En desarrollo, la campana de la barra superior llama a
`POST /internal/deadlines/daily-run`, para probar y mostrar los correos sin usar
Postman. No es una función del producto: el endpoint no está en el contrato y la
campana sigue fuera de alcance (`docs/Api-Contract/DECISIONES.md:189`).

- **Cuándo funciona:** con el servidor de desarrollo, `VITE_USE_MOCKS` apagado y
  `VITE_INTERNAL_TRIGGER_SECRET` cargado. Si no, la campana no hace nada.
- **De dónde sale el secreto:** `docker/docker-compose.yaml` lo toma de
  `INTERNAL_TRIGGER_SECRET`, en `docker/.env`. Después de cambiarlo hay que
  recrear el contenedor: `docker compose up -d frontend`.
- **Los correos son reales:** van a `MANAGEMENT_MAILBOX` y, si está activo
  `COPY_TO_RESPONSIBLE_LAWYER`, a los abogados responsables.
- **Un aviso se manda una sola vez:** el backend saltea lo que ya está en
  `sent_notifications`, así que repetir el clic no reenvía nada.
- **Si el secreto no coincide con el del backend, se cierra la sesión:** la ruta
  responde `401 UNAUTHENTICATED` y el interceptor de `http` lo trata como una
  sesión vencida.
