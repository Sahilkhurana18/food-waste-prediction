FROM node:20-slim

WORKDIR /app

# Prisma's query engine needs OpenSSL. node:20-slim is Debian-based (glibc),
# which avoids the musl/OpenSSL mismatch that breaks Prisma on node:20-alpine
# (that combination produces cryptic "not valid JSON" engine errors).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 4000

# Applies pending migrations, then starts the server. Safe to run on every
# container start — it's a no-op if the schema is already up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
