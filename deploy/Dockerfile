# DrywallEstimator — Vite React client + Express server (single service).
FROM node:22-bookworm-slim
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates default-mysql-client \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
# Optional build-time client id (Vite bakes VITE_* at build)
ARG VITE_APP_ID=
ENV VITE_APP_ID=$VITE_APP_ID
RUN pnpm install --frozen-lockfile
RUN pnpm run build
EXPOSE 3000
