# syntax=docker/dockerfile:1

# Multi-stage build:
#   deps    -> installs node_modules (cached unless package*.json changes)
#   build   -> bundles dist/index.js, then drops devDependencies
#   runtime -> slim image with only the bundle + production node_modules
#
# Sizes (approx., linux/amd64):
#   before: node:17.9.0-bullseye + full install + runtime esbuild   ~1.1 GB
#   after : node:22-bookworm-slim + dist + prod deps                ~250 MB

ARG NODE_VERSION=22-bookworm-slim

# ---------- deps ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

COPY package.json package-lock.json ./

# pouchdb-utils is installed from the in-repo submodule (file:src/lib/src/patches/pouchdb-utils),
# so this directory must exist before npm install runs.
COPY src/lib/src/patches/pouchdb-utils ./src/lib/src/patches/pouchdb-utils
RUN test -f src/lib/src/patches/pouchdb-utils/package.json \
      || { echo "ERROR: src/lib submodule is empty -> run: git submodule update --init --recursive"; exit 1; }

# package-lock.json is now in sync with package.json (the esbuild platform packages were
# missing, which made `npm ci` fail), so installs stay reproducible.
RUN npm ci

# ---------- build ----------
FROM deps AS build
COPY esbuild.config.mjs tsconfig.json ./
COPY src ./src
# npm links `file:` dependencies, so node_modules/pouchdb-utils is a symlink into
# src/lib; dereference it here so the runtime stage does not need the sources.
RUN npm run build \
    && npm prune --omit=dev \
    && rm -rf node_modules/pouchdb-utils \
    && cp -rL src/lib/src/patches/pouchdb-utils node_modules/pouchdb-utils

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY dat/config.sample.json ./config.sample.json

# leveldown ships a prebuilt N-API binary for every platform (~3 MB of dead weight);
# keep only the one matching the image architecture.
RUN node -e "const fs=require('fs'),p='node_modules/leveldown/prebuilds',k=process.platform+'-'+process.arch;for(const d of fs.readdirSync(p))if(d!==k)fs.rmSync(p+'/'+d,{recursive:true,force:true});"

# /data holds config + vaults and is the volume; ./dat stays a symlink to it
# (the app reads ./dat/config.json relative to WORKDIR).
RUN mkdir -p /data \
    && cp config.sample.json /data/config.sample.json \
    && rm config.sample.json \
    && ln -s /data /app/dat

VOLUME /data

# Bundle is self-contained except for production node_modules; no runtime build needed.
# (The previous entrypoint was `npm run dev`, which re-ran esbuild inside the container
#  and required the whole devDependency toolchain at runtime.)
ENTRYPOINT ["node", "dist/index.js"]

# Uncomment to drop root (needs the /data volume to be writable by uid 1000):
# USER node
