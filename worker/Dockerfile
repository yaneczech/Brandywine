FROM node:22-alpine
RUN apk add --no-cache ffmpeg ghostscript inkscape
WORKDIR /worker
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "start"]
