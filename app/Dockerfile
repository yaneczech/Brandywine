# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY svelte.config.js ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

# Runtime stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/drizzle ./drizzle
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
