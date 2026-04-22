"""
Train ML models using REAL data from MongoDB.
Usage: python train_from_db.py
"""
import os
import pandas as pd
import numpy as np
from pymongo import MongoClient
from xgboost import XGBClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score
import joblib
from datetime import datetime

# ── MongoDB Connection ────────────────────────────────────────
MONGO_URI = 'mongodb+srv://Medifollow:Medifollow2025@cluster0.15l0i6q.mongodb.net/?retryWrites=true&w=majority'
DB_NAME   = 'test'

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

print(f"Connected to MongoDB: {DB_NAME}")

# ── Fetch data ────────────────────────────────────────────────
users_col  = db['users']
vitals_col = db['vitalparameters']
roles_col  = db['roles']

# Get patient role ID
patient_role = roles_col.find_one({'name': 'patient'})
if not patient_role:
    print("❌ Patient role not found in DB")
    exit(1)

# Get all patients
patients = list(users_col.find({'role': patient_role['_id'], 'isArchived': {'$ne': True}}))
print(f"Found {len(patients)} patients")

if len(patients) < 10:
    print("❌ Not enough patients for training (need at least 10)")
    exit(1)

# ── Build dataset ─────────────────────────────────────────────
data = []

for p in patients:
    # Get latest vitals
    vitals = list(vitals_col.find({'patientId': p['_id']}).sort('recordedAt', -1).limit(1))
    v = vitals[0] if vitals else {}

    # Calculate age
    dob = p.get('dateOfBirth')
    age = 50
    if dob:
        try:
            age = (datetime.now() - dob).days // 365
        except:
            pass

    # BMI
    weight = v.get('weight')
    height = p.get('height')
    bmi = 28.0
    if weight and height:
        bmi = weight / ((height / 100) ** 2)
    elif v.get('bmi'):
        bmi = v.get('bmi')

    # Features
    gender         = 1 if p.get('gender') == 'male' else 0
    married        = 1 if p.get('maritalStatus') == 'married' else 0
    hypertension   = 1 if (v.get('bloodPressureSystolic') or 0) > 140 else 0
    heart_disease  = 1 if (v.get('heartRate') or 0) > 100 else 0
    glucose        = v.get('bloodGlucose') or 100

    # Simulate stroke label (for demo — in real scenario you'd have historical data)
    # High risk if: age > 65 + hypertension + high glucose
    stroke = 1 if (age > 65 and hypertension and glucose > 200) else 0

    data.append({
        'age': age,
        'gender': gender,
        'hypertension': hypertension,
        'heart_disease': heart_disease,
        'ever_married': married,
        'work_type': 0,  # Private
        'Residence_type': 1,  # Urban
        'avg_glucose_level': glucose,
        'bmi': bmi,
        'smoking_status': 3,  # Unknown
        'stroke': stroke,
    })

df = pd.DataFrame(data)
print(f"Dataset built: {len(df)} rows")
print(f"Stroke cases: {df['stroke'].sum()} / {len(df)} ({df['stroke'].mean()*100:.1f}%)")

if df['stroke'].sum() < 2:
    print("⚠️ Not enough stroke cases for training. Using synthetic data...")
    # Add synthetic high-risk cases
    for i in range(10):
        df = pd.concat([df, pd.DataFrame([{
            'age': 70 + i, 'gender': i % 2, 'hypertension': 1, 'heart_disease': 1,
            'ever_married': 1, 'work_type': 0, 'Residence_type': 1,
            'avg_glucose_level': 220 + i*5, 'bmi': 32 + i, 'smoking_status': 2, 'stroke': 1
        }])], ignore_index=True)
    print(f"Added synthetic data. New total: {len(df)} rows, {df['stroke'].sum()} strokes")

# ── Train XGBoost ─────────────────────────────────────────────
FEATURES = ['age', 'hypertension', 'heart_disease', 'gender', 'ever_married',
            'work_type', 'Residence_type', 'avg_glucose_level', 'bmi', 'smoking_status']

X = df[FEATURES]
y = df['stroke']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

xgb = XGBClassifier(
    n_estimators=300, max_depth=4, learning_rate=0.05,
    use_label_encoder=False, eval_metric='auc', random_state=42,
    scale_pos_weight=(y == 0).sum() / max((y == 1).sum(), 1)
)
xgb.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=50)

acc = accuracy_score(y_test, xgb.predict(X_test))
auc = roc_auc_score(y_test, xgb.predict_proba(X_test)[:, 1])
print(f"\nXGBoost → Accuracy: {acc:.4f} | AUC: {auc:.4f}")

joblib.dump(xgb, f'{MODELS_DIR}/xgboost_stroke.pkl')
print("XGBoost model saved.")

# ── Train KMeans ──────────────────────────────────────────────
CLUSTER_FEATURES = ['age', 'avg_glucose_level', 'bmi', 'hypertension', 'heart_disease']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X[CLUSTER_FEATURES])

kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
kmeans.fit(X_scaled)

df['cluster'] = kmeans.labels_
stroke_rate_0 = df[df['cluster'] == 0]['stroke'].mean()
stroke_rate_1 = df[df['cluster'] == 1]['stroke'].mean()
print(f"\nCluster 0 stroke rate: {stroke_rate_0:.3f}")
print(f"Cluster 1 stroke rate: {stroke_rate_1:.3f}")
HIGH_RISK_CLUSTER = 1 if stroke_rate_1 > stroke_rate_0 else 0
print(f"High-risk cluster: {HIGH_RISK_CLUSTER}")

joblib.dump(kmeans, f'{MODELS_DIR}/kmeans_stroke.pkl')
joblib.dump(scaler,  f'{MODELS_DIR}/scaler.pkl')
joblib.dump({'high_risk_cluster': HIGH_RISK_CLUSTER}, f'{MODELS_DIR}/meta.pkl')
print("KMeans + scaler saved.")
print("\n✅ All models trained from MongoDB data and saved in models/")
