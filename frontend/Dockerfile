FROM node:22-alpine AS development
WORKDIR /app
COPY ./package*.json /app/
# Caché de npm entre builds (BuildKit): si cambió package-lock.json, npm ci
# baja sólo lo que no tiene. No cambia qué se instala: npm ci verifica cada
# paquete contra el hash del lock.
RUN --mount=type=cache,target=/root/.npm npm ci
# Sin COPY del código: docker-compose monta ../frontend sobre /app, así que de
# la imagen solo se usa node_modules. Un stage de producción sí lo necesita.
EXPOSE 5173
# --host 0.0.0.0: por defecto Vite bindea a localhost, que dentro del
# contenedor es inalcanzable desde el host aunque el puerto esté mapeado.
CMD [ "npm", "run", "dev", "--", "--host", "0.0.0.0" ]
