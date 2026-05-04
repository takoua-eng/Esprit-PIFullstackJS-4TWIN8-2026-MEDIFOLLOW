import requests
import json

# Tester avec les données d'Amina Jlassi
data = {
    "age": 76,
    "hypertension": 1,
    "heart_disease": 1,
    "gender": 0,
    "ever_married": 0,
    "work_type": "private",
    "Residence_type": 0,
    "avg_glucose_level": 270,
    "bmi": 34.9,
    "smoking_status": "smokes"
}

print("🔴 Test patient haut risque (Amina Jlassi):")
print(json.dumps(data, indent=2))

response = requests.post("http://localhost:5001/predict", json=data)
result = response.json()

print("\n📊 Réponse de l'API:")
print(json.dumps(result, indent=2, ensure_ascii=False))

print(f"\n✅ Résultat:")
print(f"   Probabilité: {result['prediction']['riskProbability']*100:.1f}%")
print(f"   Niveau: {result['prediction']['riskLevel']}")
print(f"   Score: {result['prediction']['riskScore']}%")