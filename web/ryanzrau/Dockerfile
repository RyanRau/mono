FROM node:20-alpine AS builder
WORKDIR /app

# Copy bluestar library source
COPY ../libraries/bluestar/ /app/libraries/bluestar/

# Install only build tools in bluestar (not peer dependencies)
WORKDIR /app/libraries/bluestar
RUN npm install --no-save tsup typescript

# Build bluestar
RUN npm run build

# Copy and install ryanzrau dependencies (includes bluestar)
WORKDIR /app/ryanzrau
COPY ryanzrau/package*.json ./
RUN npm ci --ignore-scripts
COPY ryanzrau/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/ryanzrau/build /usr/share/nginx/html
COPY ryanzrau/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
