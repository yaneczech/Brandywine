FROM node:22-alpine AS builder
WORKDIR /worker
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache ffmpeg ghostscript inkscape
WORKDIR /worker
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /worker/dist ./dist
CMD ["npm", "start"]
