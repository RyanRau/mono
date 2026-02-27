FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download && go build -o flowrunner .

FROM alpine:latest
RUN apk add --no-cache curl python3
COPY --from=builder /app/flowrunner /usr/local/bin/flowrunner
ENTRYPOINT ["flowrunner", "--flow", "/flow.json"]
