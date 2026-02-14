FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools globally
RUN npm install -g tsup typescript

# Copy bluestar library source
COPY ../libraries/bluestar/ /app/libraries/bluestar/

# Build bluestar (uses global tsup, no node_modules needed)
WORKDIR /app/libraries/bluestar
RUN tsup src/index.ts --dts --format esm,cjs --out-dir dist --external react,react-dom,goober

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
