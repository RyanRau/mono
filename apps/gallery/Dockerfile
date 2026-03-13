FROM node:20-alpine AS builder

# Build bluestar dependency first
WORKDIR /app/packages/bluestar
COPY packages/bluestar/package*.json ./
RUN npm install --ignore-scripts
COPY packages/bluestar/ .
RUN npm run build

# Install and build gallery
WORKDIR /app/apps/gallery
COPY apps/gallery/package*.json ./
RUN npm ci
COPY apps/gallery/ .

ARG VITE_NHOST_SUBDOMAIN
ARG VITE_NHOST_REGION
ARG VITE_GALLERY_API_URL
ENV VITE_NHOST_SUBDOMAIN=$VITE_NHOST_SUBDOMAIN
ENV VITE_NHOST_REGION=$VITE_NHOST_REGION
ENV VITE_GALLERY_API_URL=$VITE_GALLERY_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/gallery/dist /usr/share/nginx/html
COPY apps/gallery/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
