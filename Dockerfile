# Stage 1: Build phase
FROM node:20-alpine AS builder
WORKDIR /app

# Install C++ build tools and permissions for argon2 compilation
RUN apk add --no-cache python3 make g++ && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./

# Use npm install instead of ci to handle lock file issues
RUN npm install --omit=dev

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app

# Install runtime dependencies and create node user
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node modules and app code
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
