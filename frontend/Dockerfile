FROM node:22-alpine AS development
WORKDIR /app
COPY ./package*.json /app/
RUN npm ci
COPY . .
EXPOSE 5173
# --host 0.0.0.0: por defecto Vite bindea a localhost, que dentro del
# contenedor es inalcanzable desde el host aunque el puerto esté mapeado.
CMD [ "npm", "run", "dev", "--", "--host", "0.0.0.0" ]
