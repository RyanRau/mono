FROM node:20-alpine AS builder
WORKDIR /app
COPY web/tic-tac-toe/package*.json ./
RUN npm ci
COPY web/tic-tac-toe/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY web/tic-tac-toe/package*.json ./
RUN npm ci --omit=dev
COPY web/tic-tac-toe/server ./server
COPY --from=builder /app/build ./build
EXPOSE 80
ENV PORT=80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
CMD ["node", "server/index.js"]
