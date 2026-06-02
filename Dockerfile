# Build stage
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./
COPY --from=build /app/tsconfig.json ./

RUN npm install --production
RUN npm install -g tsx

ENV NODE_ENV=production
ENV PORT=3000
ENV SLIMS_API_BASE=https://pelotxo.synology.me/slims/api/v1

EXPOSE 3000

CMD ["tsx", "server.ts"]
