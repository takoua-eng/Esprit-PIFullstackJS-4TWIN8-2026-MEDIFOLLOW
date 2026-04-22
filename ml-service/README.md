# ML Service — Stroke Risk Prediction

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Put the CSV file here:
#    ml-service/data/healthcare-dataset-stroke-data.csv

# 3. Train the models (run ONCE)
python train_model.py

# 4. Start the API
python app.py
```

## API Endpoints

### GET /health
Check if service is running and models are loaded.

### POST /predict
Predict stroke risk for one patient.

**Body:**
```json
{
  "age": 67,
  "gender": "Male",
  "hypertension": 0,
  "heart_disease": 1,
  "ever_married": "Yes",
  "work_type": "Private",
  "Residence_type": "Urban",
  "avg_glucose_level": 228.69,
  "bmi": 36.6,
  "smoking_status": "formerly smoked"
}
```

**Response:**
```json
{
  "riskScore": 78.5,
  "riskLevel": "HIGH",
  "riskColor": "#d63031",
  "probability": 0.785,
  "cluster": 1,
  "clusterLabel": "Profil à risque élevé",
  "isHighRisk": true,
  "recommendations": [
    "Âge > 65 ans : surveillance cardiologique renforcée recommandée",
    "Maladie cardiaque : suivi cardiologique prioritaire"
  ]
}
```

### POST /predict/batch
Predict for multiple patients — returns sorted by risk score.
