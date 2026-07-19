# Deterministic Cloud Run image. Buildpacks would prune devDependencies, and
# the server runs TypeScript directly via tsx, so we control install explicitly.
FROM node:22-slim

WORKDIR /app

# Dependencies first so layer caching survives source edits.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Produces dist/client, which Express serves in production.
RUN npm run build

ENV NODE_ENV=production
# Cloud Run injects PORT; 8080 is the documented default.
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start"]
