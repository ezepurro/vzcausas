FROM postgres:16-alpine
LABEL maintainer="losnodejantes@gmail.com"
COPY ./init/ /docker-entrypoint-initdb.d/
EXPOSE 5432
