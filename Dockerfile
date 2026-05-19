FROM node:24-alpine AS build
WORKDIR /app

ARG APP_BASE_URL
ENV APP_BASE_URL=${APP_BASE_URL}

ARG APP_BUILD=utildex

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:app -- --app=${APP_BUILD}

FROM nginx:1.27-alpine
ARG APP_BUILD=utildex
COPY --from=build /app/dist/${APP_BUILD} /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
