FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y git --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json
COPY ./esbuild.config.mjs /app/esbuild.config.mjs
COPY ./postinstall.js /app/postinstall.js
# ensure dist is clean before building
RUN rm -rf /app/dist 

RUN --mount=type=cache,target=/root/.npm npm install
RUN npm run build
RUN mkdir -p /app/logs
RUN mkdir -p /app/data

FROM gcr.io/distroless/nodejs24-debian12 AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/logs /app/logs
COPY --from=builder /app/data /app/data
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/Release/better_sqlite3.node

ENV NODE_ENV=production

CMD ["--no-deprecation", "--enable-source-maps", "/app/dist/standalone.js"]
