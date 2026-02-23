# 1. Gunakan Node.js versi ringan sebagai sistem operasi dasar
FROM node:22-alpine AS builder

# 2. Set direktori kerja di dalam kontainer
WORKDIR /app

# 3. Install pnpm secara global di dalam kontainer
RUN npm install -g pnpm

# 4. Salin file konfigurasi dependencies
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 5. Install semua dependencies (termasuk devDependencies untuk build)
RUN pnpm install

# 6. Salin seluruh kode aplikasi Anda
COPY . .

# 7. Generate Prisma Client dan Build NestJS
RUN npx prisma generate
RUN pnpm build

# --- TAHAP 2: PRODUCTION IMAGE (Biar ukurannya kecil) ---
FROM node:22-alpine AS production

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod

RUN pnpm add dotenv prisma

COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npx prisma generate

# 6. Salin hasil compile NestJS dari Builder
COPY --from=builder /app/dist ./dist

# Buka port 3000
EXPOSE 3000

# Eksekusi migrasi & nyalakan server
CMD ["node", "dist/src/main.js"]