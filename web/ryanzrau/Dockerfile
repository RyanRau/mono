FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace config and all package.json files first for layer caching
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/ui-components/package.json packages/ui-components/
COPY packages/utils/package.json packages/utils/
COPY web/ryanzrau/package.json web/ryanzrau/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ui-components/ packages/ui-components/
COPY packages/utils/ packages/utils/
COPY web/ryanzrau/ web/ryanzrau/

# Build packages in dependency order, then build the app
RUN pnpm --filter @myorg/ui-components build && \
    pnpm --filter @myorg/utils build && \
    pnpm --filter ryanzrau build

FROM nginx:alpine
COPY --from=builder /app/web/ryanzrau/dist /usr/share/nginx/html
COPY web/ryanzrau/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
