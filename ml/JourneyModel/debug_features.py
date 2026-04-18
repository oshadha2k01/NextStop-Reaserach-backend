import pandas as pd
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import DATASETS_PATH
from utils.feature_engineering import get_feature_list

processed_path = os.path.join(DATASETS_PATH, "processed_dataset.csv")
df = pd.read_csv(processed_path)

print("=== DATASET INSPECTION ===")
print(f"\nDataset shape: {df.shape}")
print(f"Total columns: {len(df.columns)}")

print("\n=== REQUIRED FEATURES BY get_feature_list() ===")
required_features = get_feature_list()
print(f"Total required features: {len(required_features)}")
for i, f in enumerate(required_features, 1):
    print(f" {i:2d}. {f}")

print("\n=== FEATURES PRESENT IN CSV ===")
present = [f for f in required_features if f in df.columns]
print(f"Features present: {len(present)}/{len(required_features)}")
for f in present:
    print(f"  ✓ {f}")

print("\n=== FEATURES MISSING FROM CSV ===")
missing = [f for f in required_features if f not in df.columns]
if missing:
    print(f"Features missing: {len(missing)}/{len(required_features)}")
    for f in missing:
        print(f"  ✗ {f}")
else:
    print("All required features present!")

print("\n=== ACTUAL COLUMNS IN CSV ===")
print("Columns in processed_dataset.csv:")
for i, col in enumerate(df.columns, 1):
    dtype = df[col].dtype
    print(f"  {i:2d}. {col:40s} ({dtype})")
