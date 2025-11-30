FROM node:25-alpine AS builder

WORKDIR /app

# Only copy manifest files first to leverage Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Build the production bundle (Vite outputs to dist/ by default)
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine-slim

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
