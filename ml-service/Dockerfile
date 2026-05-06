# ── Stage 1: Build / Install dependencies ─────────────────
FROM python:3.10-slim AS builder

WORKDIR /app

# Dépendances système pour numpy / scipy / xgboost
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier requirements
COPY requirements.txt .

# Installer dépendances Python
RUN pip install --upgrade pip
RUN pip install --prefix=/install -r requirements.txt


# ── Stage 2: Runtime léger ────────────────────────────────
FROM python:3.10-slim AS production

WORKDIR /app

# Copier seulement les libs installées (image plus légère)
COPY --from=builder /install /usr/local

# Copier le code ML
COPY . .

# Variables utiles
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Port si API (optionnel)
EXPOSE 5000

# Commande (adapter selon ton projet)
CMD ["python", "test.py"]