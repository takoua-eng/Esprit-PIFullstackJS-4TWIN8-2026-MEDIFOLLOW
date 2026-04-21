# Guide d'activation du AI Medical Intelligence

## Ce que tu vois dans le dashboard
Le widget "AI Medical Intelligence" est déjà intégré dans le super admin dashboard.
Il a 4 boutons : Rapport mensuel, Patients à risque, Coordinateurs, Anomalies.
Quand tu cliques, il appelle l'API OpenAI et affiche une analyse en français.

---

## Pourquoi ça ne fonctionne pas encore

Le code est prêt. Il manque juste la clé API OpenAI dans le fichier .env du backend.

---

## Étapes pour l'activer

### Étape 1 — Créer une nouvelle clé OpenAI

1. Va sur https://platform.openai.com/api-keys
2. Connecte-toi avec ton compte OpenAI
3. Clique sur "Create new secret key"
4. Donne-lui un nom (ex: "mediflow-dev")
5. Copie la clé (commence par sk-proj-...)
6. IMPORTANT : ne la partage jamais, ne la mets pas dans .env.example ou GitHub

### Étape 2 — Ajouter la clé dans le fichier .env

Ouvre le fichier : backend/.env  (pas .env.example)

Ajoute cette ligne à la fin :
```
OPENAI_API_KEY=sk-proj-ta-cle-ici
```

Si le fichier .env n'existe pas, crée-le en copiant .env.example et remplis les valeurs.

### Étape 3 — Vérifier le crédit OpenAI

OpenAI est payant. Si ton compte est nouveau :
1. Va sur https://platform.openai.com/billing
2. Ajoute une carte bancaire
3. Ajoute un crédit minimum (5$)

Le modèle utilisé est gpt-4o-mini — très économique (environ 0.001$ par requête).

### Étape 4 — Redémarrer le backend

Dans le terminal du backend :
```
Ctrl+C  (arrêter le serveur)
npm run start:dev  (redémarrer)
```

Tu dois voir dans les logs :
```
[NestJS] Application is running on: http://localhost:3000
```

### Étape 5 — Tester dans Postman

**D'abord, obtenir un token super admin :**
```
Méthode : POST
URL     : http://localhost:3000/auth/login
Body    : {
            "email": "ton_superadmin@email.com",
            "password": "TonPassword"
          }
```
Copie le accessToken de la réponse.

**Ensuite, tester le AI report :**
```
Méthode : POST
URL     : http://localhost:3000/coordinator/admin/ai-report
Headers : Authorization: Bearer <accessToken>
          Content-Type: application/json
Body    : { "type": "monthly" }
```

**Valeurs possibles pour "type" :**
- "monthly"      → Rapport mensuel de compliance
- "risk"         → Analyse des patients à risque
- "coordinators" → Performance des coordinateurs
- "anomalies"    → Analyse des anomalies

**Réponse attendue si tout fonctionne :**
```json
{
  "type": "monthly",
  "response": "Ce mois, 23 patients ont été suivis sur la plateforme...",
  "generatedAt": "2026-04-20T18:30:00.000Z",
  "dataContext": {
    "totalPatients": 23,
    "okCount": 15,
    "noDataCount": 8,
    "sentReminders": 150
  }
}
```

### Étape 6 — Tester dans le frontend

1. Connecte-toi en tant que super admin
2. Va sur le dashboard super admin
3. Scroll vers le bas jusqu'au widget "AI Medical Intelligence"
4. Clique sur "Rapport mensuel"
5. Attends 2-3 secondes
6. Le texte de l'analyse apparaît dans le widget

---

## Erreurs possibles et solutions

**Erreur : "Service AI temporairement indisponible"**
→ La clé OPENAI_API_KEY n'est pas dans .env ou le backend n'a pas été redémarré.

**Erreur 401 dans Postman**
→ Le token est expiré. Refais le login pour obtenir un nouveau token.

**Erreur 403 dans Postman**
→ L'utilisateur connecté n'est pas super admin (permission '*' requise).

**Erreur "insufficient_quota" de OpenAI**
→ Pas de crédit sur le compte OpenAI. Va sur platform.openai.com/billing.

**Erreur "invalid_api_key"**
→ La clé dans .env est incorrecte ou a été révoquée. Crée une nouvelle clé.

---

## Alternative gratuite — Groq

Si tu ne veux pas payer OpenAI, utilise Groq (gratuit) :

1. Va sur https://console.groq.com
2. Crée un compte gratuit
3. Va dans API Keys → Create API Key
4. Ajoute dans backend/.env :
   GROQ_API_KEY=gsk_ta_cle_groq_ici

Le code détecte automatiquement Groq si GROQ_API_KEY est présent.
Groq utilise le modèle llama-3.1-8b-instant — rapide et gratuit.

---

## Résumé en une ligne

Ajoute OPENAI_API_KEY=sk-... dans backend/.env → redémarre → clique sur un bouton dans le dashboard.
