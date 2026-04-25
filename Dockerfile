# Stage 1: Build phase
FROM node:20-alpine AS builder
WORKDIR /app

# Install C++ build tools so native modules like argon2 can compile!
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "src/server.js"]

# Install specific versions to mitigate vulnerabilities
RUN npm install cross-spawn@7.0.5 glob@10.5.0 minimatch@9.0.7 --omit=dev && npm cache clean --force
