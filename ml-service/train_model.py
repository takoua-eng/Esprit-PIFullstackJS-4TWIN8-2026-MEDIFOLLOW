import os
import pandas as pd
import numpy as np
import joblib
import warnings
warnings.filterwarnings('ignore')

from xgboost import XGBClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE

# ─────────────────────────────
DATA_PATH = "data/healthcare-dataset-stroke-data.csv"
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

# ─────────────────────────────
df = pd.read_csv(DATA_PATH)
df = df[df["gender"] != "Other"].copy()

df["bmi"] = pd.to_numeric(df["bmi"], errors="coerce")
df["bmi"] = df["bmi"].fillna(df["bmi"].median())

# Encoding
df["gender"] = (df["gender"] == "Male").astype(int)
df["ever_married"] = (df["ever_married"] == "Yes").astype(int)
df["Residence_type"] = (df["Residence_type"] == "Urban").astype(int)

WORK_MAP = {"Private": 0, "Self-employed": 1, "Govt_job": 2, "children": 3, "Never_worked": 4}
SMOKE_MAP = {"never smoked": 0, "formerly smoked": 1, "smokes": 2, "Unknown": 3}

df["work_type"] = df["work_type"].map(WORK_MAP).fillna(0).astype(int)
df["smoking_status"] = df["smoking_status"].map(SMOKE_MAP).fillna(3).astype(int)

FEATURES = [
    "age", "hypertension", "heart_disease", "gender", "ever_married",
    "work_type", "Residence_type", "avg_glucose_level", "bmi", "smoking_status"
]

X = df[FEATURES]
y = df["stroke"]

# ─────────────────────────────
# SPLIT
# ─────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ─────────────────────────────
# SMOTE
# ─────────────────────────────
min_class = y_train.sum()
k_neighbors = min(3, max(1, min_class - 1))

smote = SMOTE(random_state=42, k_neighbors=k_neighbors)
X_train, y_train = smote.fit_resample(X_train, y_train)

# ─────────────────────────────
# MODEL XGBOOST (FIX PRINCIPAL)
# ─────────────────────────────
scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

model = XGBClassifier(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    scale_pos_weight=scale_pos_weight,
    random_state=42
)

print("🚀 Training...")

# ✅ CORRECT WAY
model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False
)

# ─────────────────────────────
# EVALUATION
# ─────────────────────────────
pred = model.predict(X_test)
proba = model.predict_proba(X_test)[:, 1]

print("\n📊 REPORT")
print(classification_report(y_test, pred))
print("AUC:", roc_auc_score(y_test, proba))

# ─────────────────────────────
# SAVE
# ─────────────────────────────
joblib.dump(model, f"{MODELS_DIR}/xgboost_stroke.pkl")
print("✅ Model saved")

# ─────────────────────────────
# KMEANS
# ─────────────────────────────
CLUSTER_FEATURES = ["age", "avg_glucose_level", "bmi", "hypertension", "heart_disease"]

scaler = StandardScaler()
Xc = scaler.fit_transform(df[CLUSTER_FEATURES])

kmeans = KMeans(n_clusters=2, random_state=42, n_init=20)
df["cluster"] = kmeans.fit_predict(Xc)

risk0 = df[df["cluster"] == 0]["stroke"].mean()
risk1 = df[df["cluster"] == 1]["stroke"].mean()

high_cluster = 1 if risk1 > risk0 else 0

joblib.dump(kmeans, f"{MODELS_DIR}/kmeans_stroke.pkl")
joblib.dump(scaler, f"{MODELS_DIR}/scaler.pkl")
joblib.dump({"high_risk_cluster": high_cluster}, f"{MODELS_DIR}/meta.pkl")

print("🎯 HIGH RISK CLUSTER:", high_cluster)
print("🎉 DONE")