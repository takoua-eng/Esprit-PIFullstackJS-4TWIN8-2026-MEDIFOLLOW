# ── Stage 1: Build ───────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Builder Angular en production
RUN npm run build -- --configuration production

# ── Stage 2: Serve avec Nginx ─────────────────────────────
FROM nginx:alpine AS production

# Copier le build Angular vers nginx
COPY --from=builder /app/dist/browser /usr/share/nginx/html

# Copier la config nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
