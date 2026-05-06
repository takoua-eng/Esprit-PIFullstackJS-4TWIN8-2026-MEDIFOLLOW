# Image Python officielle
FROM python:3.10-slim

# Evite les erreurs pip / build
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Dossier de travail
WORKDIR /app

# Installer dépendances système (important pour numpy, sklearn, xgboost)
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier requirements d'abord (cache Docker optimisé)
COPY requirements.txt .

# Installer dépendances Python
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copier tout le code ML
COPY . .

# (optionnel) port si API Flask/FastAPI
EXPOSE 5000

# Commande par défaut
CMD ["python", "test.py"]