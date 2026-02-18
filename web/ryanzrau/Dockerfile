FROM node:20-alpine AS builder

# Build bluestar dependency first
WORKDIR /app/packages/bluestar
COPY packages/bluestar/package*.json ./
RUN npm install
COPY packages/bluestar/ .
RUN npm run build

# Install and build ryanzrau
WORKDIR /app/web/ryanzrau
COPY web/ryanzrau/package*.json ./
RUN npm ci
COPY web/ryanzrau/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/web/ryanzrau/dist /usr/share/nginx/html
COPY web/ryanzrau/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
