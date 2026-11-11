# Сборка живёт в образе: новый контейнер стартует только с готовым dist,
# старый отдаёт сайт, пока образ собирается.

FROM node:26.11.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --loglevel=error
COPY . .
# .env приходит секретом сборки: переменные нужны на этапе build,
# но в слоях образа файла не остаётся.
RUN --mount=type=secret,id=env,target=/app/.env npm run build

FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
