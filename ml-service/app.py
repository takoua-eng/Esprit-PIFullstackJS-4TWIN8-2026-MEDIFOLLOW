from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

MODELS_DIR = "models"

try:
    xgb_model = joblib.load(f"{MODELS_DIR}/xgboost_stroke.pkl")
    kmeans_model = joblib.load(f"{MODELS_DIR}/kmeans_stroke.pkl")
    scaler = joblib.load(f"{MODELS_DIR}/scaler.pkl")
    meta = joblib.load(f"{MODELS_DIR}/meta.pkl")
    logger.info("✅ Modèles chargés avec succès")
except Exception as e:
    logger.error(f"❌ Erreur chargement: {e}")
    raise

WORK_MAP = {"private": 0, "self employed": 1, "self-employed": 1, "govt job": 2, "govt_job": 2, "children": 3, "never worked": 4}
SMOKE_MAP = {"never smoked": 0, "formerly smoked": 1, "smokes": 2, "unknown": 3}
FEATURE_ORDER = ["age", "hypertension", "heart_disease", "gender", "ever_married",
                 "work_type", "Residence_type", "avg_glucose_level", "bmi", "smoking_status"]

def normalize(v):
    if not v:
        return "private"
    return str(v).strip().lower().replace("_", " ").replace("-", " ")

# 🔥 NOUVEAU : Score pondéré cliniquement
def compute_risk_score(prob: float, data: dict) -> float:
    base = prob * 100

    bonus = 0
    if data.get("age", 0) >= 70:                    bonus += 15
    elif data.get("age", 0) >= 60:                  bonus += 8
    elif data.get("age", 0) >= 50:                  bonus += 4

    if data.get("hypertension", 0) == 1:            bonus += 10
    if data.get("heart_disease", 0) == 1:           bonus += 10

    if data.get("avg_glucose_level", 0) > 200:      bonus += 10
    elif data.get("avg_glucose_level", 0) > 140:    bonus += 5

    if data.get("bmi", 0) > 35:                     bonus += 8
    elif data.get("bmi", 0) > 30:                   bonus += 4

    if data.get("smoking_status") == 2:             bonus += 5

    final = min(round(base + bonus, 1), 100.0)
    logger.info(f"📊 Score: base={base:.1f} + bonus={bonus} = {final}")
    return final

# 🔥 NOUVEAU : Seuils corrigés
def classify_risk(prob: float, critical_count: int) -> str:
    if prob >= 0.25:
        level = "HIGH"
    elif prob >= 0.10:
        level = "MEDIUM"
    else:
        level = "LOW"

    # Upgrade si ≥3 facteurs critiques
    if critical_count >= 3 and level != "HIGH":
        logger.warning(f"⚠️ UPGRADE: {level} → HIGH ({critical_count} facteurs)")
        level = "HIGH"

    return level

def get_recommendations(level: str, data: dict) -> list:
    recs = []
    if level == "HIGH":
        recs = [
            "🩺 Consulter un cardiologue en urgence",
            "📊 Surveillance tensionnelle quotidienne",
            "🥗 Régime pauvre en sel",
            "🚭 Arrêt du tabac",
            "🏃 Activité physique 30min/jour"
        ]
        if data.get("avg_glucose_level", 0) > 140:
            recs.append(f"🔬 Glycémie à surveiller ({data['avg_glucose_level']} mg/dL)")
        if data.get("bmi", 0) > 30:
            recs.append(f"⚖️ Prise en charge nutritionnelle (IMC: {data['bmi']})")
        if data.get("heart_disease", 0) == 1:
            recs.append("❤️ Suivi cardiologique renforcé")
        if data.get("hypertension", 0) == 1:
            recs.append("💊 Traitement antihypertenseur à surveiller")
    elif level == "MEDIUM":
        recs = [
            "🩺 Bilan médical annuel",
            "🥗 Alimentation équilibrée",
            "🚶 Marche quotidienne 30min",
            "📋 Contrôle tensionnel mensuel"
        ]
        if data.get("avg_glucose_level", 0) > 140:
            recs.append("🔬 Surveiller la glycémie")
        if data.get("bmi", 0) > 30:
            recs.append("⚖️ Réduire l'IMC progressivement")
    else:
        recs = [
            "✅ Mode de vie sain à maintenir",
            "🔄 Bilan préventif annuel",
            "🥦 Alimentation équilibrée"
        ]
    return recs

@app.route("/predict", methods=["POST"])
def predict():
    logger.info("🚀 [DEBUG] Entrée dans /predict")
    try:
        data = request.get_json()

        if not data:
            logger.error("❌ JSON vide")
            return jsonify({"error": "JSON vide"}), 400

        logger.info(f"📥 Données reçues: {data}")

        # Encoder variables catégoriques
        if isinstance(data.get("work_type"), str):
            data["work_type"] = WORK_MAP.get(normalize(data["work_type"]), 0)
        if isinstance(data.get("smoking_status"), str):
            data["smoking_status"] = SMOKE_MAP.get(normalize(data["smoking_status"]), 3)

        # DataFrame dans le bon ordre
        df_input = pd.DataFrame([data])
        for col in FEATURE_ORDER:
            if col not in df_input.columns:
                df_input[col] = 0
        df_input = df_input[FEATURE_ORDER]
        logger.info(f"🔍 DataFrame: {df_input.to_dict('records')[0]}")

        # Prédiction XGBoost
        proba_array = xgb_model.predict_proba(df_input)
        logger.info(f"🎯 predict_proba: {proba_array}")

        prob_stroke = float(proba_array[0][1])
        logger.info(f"📊 Probabilité stroke brute: {prob_stroke*100:.2f}%")

        # 🔥 Comptage facteurs critiques
        critical = []
        if data.get("age", 0) >= 70:
            critical.append("age")
            logger.info("  ✓ Age ≥ 70")
        if data.get("hypertension", 0) == 1:
            critical.append("htn")
            logger.info("  ✓ Hypertension")
        if data.get("heart_disease", 0) == 1:
            critical.append("heart")
            logger.info("  ✓ Maladie cardiaque")
        if data.get("avg_glucose_level", 0) > 200:
            critical.append("glucose")
            logger.info("  ✓ Glucose > 200")
        if data.get("bmi", 0) > 30:
            critical.append("bmi")
            logger.info("  ✓ BMI > 30")

        logger.info(f"🔍 Facteurs critiques: {len(critical)}/5 → {critical}")

        # 🔥 Nouveaux seuils + upgrade
        level = classify_risk(prob_stroke, len(critical))
        logger.info(f"✅ Niveau FINAL: {level}")

        # 🔥 Score pondéré
        score = compute_risk_score(prob_stroke, data)

        # Couleurs
        color_map = {
            "HIGH":   ("#ef4444", "Élevé"),
            "MEDIUM": ("#f59e0b", "Modéré"),
            "LOW":    ("#22c55e", "Faible")
        }
        color, label = color_map[level]

        # Clustering
        cluster_feats = meta.get("cluster_features", ["age", "avg_glucose_level", "bmi", "hypertension", "heart_disease"])
        X_cluster = df_input[cluster_feats].values
        X_cluster_scaled = scaler.transform(X_cluster)
        cluster = int(kmeans_model.predict(X_cluster_scaled)[0])
        is_high_risk_cluster = (cluster == meta.get("high_risk_cluster", 1))

        return jsonify({
            "success": True,
            "prediction": {
                "riskScore": score,
                "riskProbability": round(prob_stroke, 4),
                "riskLevel": level,
                "riskLabel": label,
                "riskColor": color,
                "isHighRisk": level == "HIGH"
            },
            "clustering": {
                "cluster": cluster,
                "isHighRiskCluster": is_high_risk_cluster
            },
            "recommendations": get_recommendations(level, data)
        })

    except Exception as e:
        logger.exception(f"❌ Erreur API: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "stroke-ml-api"}), 200

@app.route("/debug", methods=["GET"])
def debug():
    return jsonify({
        "status": "alive",
        "thresholds": {"HIGH": "≥25%", "MEDIUM": "≥10%", "LOW": "<10%"},
        "upgrade_rule": "≥3 facteurs critiques → HIGH",
        "scoring": "prob*100 + bonus clinique (max 100)"
    }), 200

if __name__ == "__main__":
    logger.info("🚀 Flask server starting on port 5001...")
    app.run(host="0.0.0.0", port=5001, debug=True)
