FROM node:20-alpine AS builder

WORKDIR /app
COPY apps/gallery_api/package*.json ./
RUN npm ci
COPY apps/gallery_api/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

ENV PORT=80
EXPOSE 80
CMD ["node", "dist/index.js"]
