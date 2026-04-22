"""
Run this ONCE to train and save the models.
Usage: python train_model.py
"""
import os
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score
import joblib

# ── Paths ─────────────────────────────────────────────────────
DATA_PATH   = 'data/healthcare-dataset-stroke-data.csv'
MODELS_DIR  = 'models'
os.makedirs(MODELS_DIR, exist_ok=True)

# ── Check if models already exist ─────────────────────────────
models_exist = all(os.path.exists(f'{MODELS_DIR}/{f}') for f in [
    'xgboost_stroke.pkl', 'kmeans_stroke.pkl', 'scaler.pkl', 'meta.pkl'
])

if models_exist:
    print("✅ Models already trained and saved in models/")
    print("   Delete models/ folder to retrain.")
    exit(0)

# ── Check CSV ──────────────────────────────────────────────────
if not os.path.exists(DATA_PATH):
    print(f"❌ CSV not found: {DATA_PATH}")
    print("   Place healthcare-dataset-stroke-data.csv in ml-service/data/")
    exit(1)

# ── Load ──────────────────────────────────────────────────────
df = pd.read_csv(DATA_PATH)
print(f"Dataset loaded: {len(df)} rows")

# ── Preprocessing ─────────────────────────────────────────────
# Drop 'Other' gender (only 1 row)
df = df[df['gender'] != 'Other'].copy()

# BMI: replace N/A with median
df['bmi'] = pd.to_numeric(df['bmi'], errors='coerce')
df['bmi'].fillna(df['bmi'].median(), inplace=True)

# Encode categoricals
df['gender']         = (df['gender'] == 'Male').astype(int)
df['ever_married']   = (df['ever_married'] == 'Yes').astype(int)
df['Residence_type'] = (df['Residence_type'] == 'Urban').astype(int)

work_map  = {'Private': 0, 'Self-employed': 1, 'Govt_job': 2, 'children': 3, 'Never_worked': 4}
smoke_map = {'never smoked': 0, 'formerly smoked': 1, 'smokes': 2, 'Unknown': 3}

df['work_type']      = df['work_type'].map(work_map).fillna(0).astype(int)
df['smoking_status'] = df['smoking_status'].map(smoke_map).fillna(3).astype(int)

FEATURES = [
    'age', 'hypertension', 'heart_disease', 'gender', 'ever_married',
    'work_type', 'Residence_type', 'avg_glucose_level', 'bmi', 'smoking_status'
]

X = df[FEATURES]
y = df['stroke']

print(f"Stroke cases: {y.sum()} / {len(y)} ({y.mean()*100:.1f}%)")

# ── XGBoost ───────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

xgb = XGBClassifier(
    n_estimators=700,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    use_label_encoder=False,
    eval_metric='auc',
    random_state=42,
    scale_pos_weight=(y == 0).sum() / (y == 1).sum()  # handle imbalance
)
xgb.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=100)

acc = accuracy_score(y_test, xgb.predict(X_test))
auc = roc_auc_score(y_test, xgb.predict_proba(X_test)[:, 1])
print(f"\nXGBoost → Accuracy: {acc:.4f} | AUC: {auc:.4f}")

joblib.dump(xgb, f'{MODELS_DIR}/xgboost_stroke.pkl')
print("XGBoost model saved.")

# ── KMeans clustering ─────────────────────────────────────────
CLUSTER_FEATURES = ['age', 'avg_glucose_level', 'bmi', 'hypertension', 'heart_disease']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X[CLUSTER_FEATURES])

kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
kmeans.fit(X_scaled)

# Identify which cluster = high risk (more strokes)
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
print("\n✅ All models trained and saved in models/")
