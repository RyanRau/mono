FROM node:20-alpine AS builder

WORKDIR /app/packages/bluestar
COPY packages/bluestar/package*.json ./
RUN npm install --ignore-scripts
COPY packages/bluestar/ .
RUN npm run build-storybook

FROM nginx:alpine
COPY --from=builder /app/packages/bluestar/storybook-static /usr/share/nginx/html
COPY apps/bluestar/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
