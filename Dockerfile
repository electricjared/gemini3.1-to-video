FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    wget \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --omit=dev \
  && npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV FFMPEG_PATH=ffmpeg

EXPOSE 3000

CMD ["npm", "start"]
