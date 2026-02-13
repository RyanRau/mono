FROM node:20-alpine AS builder
WORKDIR /app

# Copy library dependencies first
COPY libraries/bluestar /app/libraries/bluestar

# Copy ryanzrau app files
WORKDIR /app/ryanzrau
COPY ryanzrau/package*.json ./
RUN npm ci
COPY ryanzrau/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/ryanzrau/build /usr/share/nginx/html
COPY ryanzrau/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
