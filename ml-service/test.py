# test_model_direct.py
import joblib
import pandas as pd

model = joblib.load("models/xgboost_stroke.pkl")

# Patient Amina Jlassi
test_data = pd.DataFrame([{
    "age": 76,
    "hypertension": 1,
    "heart_disease": 1,
    "gender": 0,
    "ever_married": 0,
    "work_type": 0,
    "Residence_type": 0,
    "avg_glucose_level": 270,
    "bmi": 34.9,
    "smoking_status": 2
}])

proba = model.predict_proba(test_data)[0][1]
print(f"🔴 Patient haut risque (Amina):")
print(f"   Probabilité stroke: {proba*100:.2f}%")
print(f"   Prédiction: {'HIGH' if proba >= 0.25 else 'MEDIUM' if proba >= 0.10 else 'LOW'}")

# Patient faible risque
test_low = pd.DataFrame([{
    "age": 25, "hypertension": 0, "heart_disease": 0,
    "gender": 1, "ever_married": 0, "work_type": 0,
    "Residence_type": 1, "avg_glucose_level": 80,
    "bmi": 22, "smoking_status": 0
}])

proba_low = model.predict_proba(test_low)[0][1]
print(f"\n🟢 Patient faible risque:")
print(f"   Probabilité stroke: {proba_low*100:.2f}%")