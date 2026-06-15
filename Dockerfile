FROM node:22.16-bookworm-slim AS frontend-build

WORKDIR /app/frontend

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    g++ \
    make \
    pkg-config \
    python3 \
    libusb-1.0-0-dev \
  && rm -rf /var/lib/apt/lists/*

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./

ARG VITE_PRIVY_APP_ID
ARG VITE_DEAL_ESCROW_CONTRACT
ARG VITE_USDC_TOKEN_ADDRESS
ARG VITE_SOROSWAP_ROUTER_ADDRESS
ARG VITE_SOROSWAP_POOL_ADDRESS

ENV VITE_PRIVY_APP_ID=$VITE_PRIVY_APP_ID
ENV VITE_DEAL_ESCROW_CONTRACT=$VITE_DEAL_ESCROW_CONTRACT
ENV VITE_USDC_TOKEN_ADDRESS=$VITE_USDC_TOKEN_ADDRESS
ENV VITE_SOROSWAP_ROUTER_ADDRESS=$VITE_SOROSWAP_ROUTER_ADDRESS
ENV VITE_SOROSWAP_POOL_ADDRESS=$VITE_SOROSWAP_POOL_ADDRESS

RUN npm run build

FROM node:22.16-bookworm-slim AS indexer-build

WORKDIR /app/indexer

COPY indexer/package*.json ./
RUN npm ci

COPY indexer ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:22.16-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV FRONTEND_DIST_PATH=/app/frontend-dist

COPY --from=indexer-build /app/indexer/package*.json ./indexer/
COPY --from=indexer-build /app/indexer/node_modules ./indexer/node_modules
COPY --from=indexer-build /app/indexer/dist ./indexer/dist
COPY --from=frontend-build /app/frontend/dist ./frontend-dist

EXPOSE 3000

CMD ["node", "indexer/dist/server.js"]
