FROM node:20-alpine AS builder

# Build bluestar dependency first
WORKDIR /app/packages/bluestar
COPY packages/bluestar/package*.json ./
RUN npm install --ignore-scripts
COPY packages/bluestar/ .
RUN npm run build

# Install and build ryanzrau
WORKDIR /app/apps/ryanzrau
COPY apps/ryanzrau/package*.json ./
RUN npm ci
COPY apps/ryanzrau/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/ryanzrau/dist /usr/share/nginx/html
COPY apps/ryanzrau/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
