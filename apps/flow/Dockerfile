FROM node:20-alpine AS builder

# Build bluestar dependency first
WORKDIR /app/packages/bluestar
COPY packages/bluestar/package*.json ./
RUN npm install --ignore-scripts
COPY packages/bluestar/ .
RUN npm run build

# Install and build flow
WORKDIR /app/apps/flow
COPY apps/flow/package*.json ./
RUN npm ci
COPY apps/flow/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/flow/dist /usr/share/nginx/html
COPY apps/flow/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
