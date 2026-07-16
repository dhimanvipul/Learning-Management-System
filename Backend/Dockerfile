# Stage 1: Build & install dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Final lightweight image
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy source files
COPY . .

# Expose port (default 5000)
EXPOSE 5000

# Health check using lightweight node script
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({ host: 'localhost', port: process.env.PORT || 5000, path: '/', method: 'GET', timeout: 2000 }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Start the server
CMD ["node", "server.js"]
