# Релей онлайн-комнат: Node запускает TypeScript сам, сборка не нужна.
# Контекст сборки -- корень репо: протокол релея общий с игрой и лежит в src/shared.

FROM node:26.11.1-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
# В dependencies только ws: Astro, Svelte и линтеры живут в devDependencies.
# Без --ignore-scripts npm ci позвал бы prepare, а husky в образе нет.
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=package-lock.json,target=/app/package-lock.json \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error
COPY src/shared ./src/shared
COPY src/backend ./src/backend
USER node
EXPOSE 8787
CMD ["node", "src/backend/server.ts"]
