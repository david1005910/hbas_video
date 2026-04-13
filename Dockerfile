FROM node:20-bookworm-slim

# Chrome Headless Shell 실행에 필요한 라이브러리 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    fonts-noto-cjk \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# node_modules는 이미지에 고정 (볼륨 마운트로 덮어쓰지 않도록)
COPY package*.json ./
RUN npm install

# Chrome Headless Shell 사전 다운로드 (렌더링용)
RUN npx remotion browser ensure

EXPOSE 3002 3003

# 시작 스크립트: 렌더 서버(3003) + Studio(3002) 동시 실행
CMD ["sh", "-c", "node /app/render-server.mjs & npx remotion studio --port 3002"]
