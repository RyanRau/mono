FROM node:20-alpine AS builder
WORKDIR /app
COPY web/be_mine/package*.json ./
RUN npm ci
COPY web/be_mine/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY web/be_mine/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
