"""
Flask ML API — Stroke Risk Prediction
Run: python app.py
Port: 5001
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# ── Load models ───────────────────────────────────────────────
MODELS_DIR = 'models'

def load_models():
    global xgb_model, kmeans_model, scaler, meta
    try:
        xgb_model    = joblib.load(f'{MODELS_DIR}/xgboost_stroke.pkl')
        kmeans_model = joblib.load(f'{MODELS_DIR}/kmeans_stroke.pkl')
        scaler       = joblib.load(f'{MODELS_DIR}/scaler.pkl')
        meta         = joblib.load(f'{MODELS_DIR}/meta.pkl')
        print("✅ Models loaded successfully")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        xgb_model = kmeans_model = scaler = meta = None

load_models()

# ── Preprocessing ─────────────────────────────────────────────
WORK_MAP  = {'Private': 0, 'Self-employed': 1, 'Govt_job': 2, 'children': 3, 'Never_worked': 4}
SMOKE_MAP = {'never smoked': 0, 'formerly smoked': 1, 'smokes': 2, 'Unknown': 3}

def preprocess(data: dict) -> list:
    gender     = 1 if data.get('gender', 'Male') == 'Male' else 0
    married    = 1 if data.get('ever_married', 'No') == 'Yes' else 0
    residence  = 1 if data.get('Residence_type', 'Urban') == 'Urban' else 0
    work       = WORK_MAP.get(data.get('work_type', 'Private'), 0)
    smoke      = SMOKE_MAP.get(data.get('smoking_status', 'Unknown'), 3)
    bmi        = float(data.get('bmi') or 28.0)
    glucose    = float(data.get('avg_glucose_level', 100))
    age        = float(data.get('age', 40))
    hypert     = int(data.get('hypertension', 0))
    heart      = int(data.get('heart_disease', 0))

    return [age, hypert, heart, gender, married, work, residence, glucose, bmi, smoke]

def get_cluster_features(features: list) -> list:
    # age, avg_glucose_level, bmi, hypertension, heart_disease
    return [features[0], features[7], features[8], features[1], features[2]]

# ── Routes ────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'models_loaded': xgb_model is not None})

@app.route('/predict', methods=['POST'])
def predict():
    if xgb_model is None:
        return jsonify({'error': 'Models not loaded. Run train_model.py first.'}), 503

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        features = preprocess(data)

        # Stroke risk probability
        prob       = float(xgb_model.predict_proba([features])[0][1])
        risk_score = round(prob * 100, 1)

        # Risk level
        if risk_score >= 60:
            risk_level = 'HIGH'
            risk_color = '#d63031'
        elif risk_score >= 30:
            risk_level = 'MEDIUM'
            risk_color = '#fdcb6e'
        else:
            risk_level = 'LOW'
            risk_color = '#00b894'

        # Cluster
        cluster_feats  = get_cluster_features(features)
        cluster_scaled = scaler.transform([cluster_feats])
        cluster        = int(kmeans_model.predict(cluster_scaled)[0])
        high_risk_c    = meta.get('high_risk_cluster', 1)
        is_high_risk   = (cluster == high_risk_c)

        # Recommendations
        recommendations = []
        age, hypert, heart, _, _, _, _, glucose, bmi, smoke = features

        if age > 65:
            recommendations.append("Âge > 65 ans : surveillance cardiologique renforcée recommandée")
        if hypert:
            recommendations.append("Hypertension détectée : contrôle tensionnel régulier nécessaire")
        if heart:
            recommendations.append("Maladie cardiaque : suivi cardiologique prioritaire")
        if glucose > 200:
            recommendations.append("Glycémie élevée : consultation endocrinologique conseillée")
        if bmi > 30:
            recommendations.append("IMC > 30 : programme de perte de poids recommandé")
        if smoke == 2:
            recommendations.append("Tabagisme actif : sevrage tabagique fortement conseillé")
        if not recommendations:
            recommendations.append("Profil à faible risque — maintenir les habitudes de vie saines")

        return jsonify({
            'riskScore':       risk_score,
            'riskLevel':       risk_level,
            'riskColor':       risk_color,
            'probability':     round(prob, 4),
            'cluster':         cluster,
            'clusterLabel':    'Profil à risque élevé' if is_high_risk else 'Profil sain',
            'isHighRisk':      is_high_risk,
            'recommendations': recommendations,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """Predict for multiple patients at once."""
    if xgb_model is None:
        return jsonify({'error': 'Models not loaded'}), 503

    patients = request.get_json()
    if not isinstance(patients, list):
        return jsonify({'error': 'Expected a list of patients'}), 400

    results = []
    for p in patients:
        try:
            features   = preprocess(p)
            prob       = float(xgb_model.predict_proba([features])[0][1])
            risk_score = round(prob * 100, 1)
            results.append({
                'id':        p.get('id'),
                'name':      p.get('name', ''),
                'riskScore': risk_score,
                'riskLevel': 'HIGH' if risk_score >= 60 else 'MEDIUM' if risk_score >= 30 else 'LOW',
            })
        except Exception as e:
            results.append({'id': p.get('id'), 'error': str(e)})

    results.sort(key=lambda x: x.get('riskScore', 0), reverse=True)
    return jsonify(results)


if __name__ == '__main__':
    print("🚀 ML Service running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
