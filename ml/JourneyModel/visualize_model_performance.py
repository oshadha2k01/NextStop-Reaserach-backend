"""
Model Performance Visualization
Generates comprehensive graphs to evaluate the trained Journey Time Model
"""

import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Set up paths
sys.path.insert(0, os.path.join(os.getcwd(), 'ml', 'JourneyModel'))
sys.path.insert(0, os.path.join(os.getcwd(), 'ml'))

from JourneyModel.config import DATASETS_PATH, MODELS_PATH
from JourneyModel.utils.feature_engineering import create_features, get_feature_list
from JourneyModel.prediction.predict import JourneyTimePredictor

# Style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (15, 12)

print("=" * 70)
print("  JOURNEY TIME MODEL - PERFORMANCE VISUALIZATION")
print("=" * 70)

# Load processed dataset
print("\n--- Loading dataset...")
processed_path = os.path.join(DATASETS_PATH, "processed_dataset.csv")
df = pd.read_csv(processed_path)
print(f"Loaded: {len(df)} records with {len(df.columns)} columns")

# Load model
print("--- Loading trained model...")
predictor = JourneyTimePredictor()
model = predictor.model
metadata_path = os.path.join(MODELS_PATH, "model_metadata.json")

with open(metadata_path, 'r') as f:
    metadata = json.load(f)

# Extract features and target
print("--- Preparing features and target...")
feature_list = get_feature_list()
X = df[feature_list].copy()
y = df['journey_time_seconds'].copy()

# Make predictions
print("--- Generating predictions...")
y_pred = model.predict(X)

# Apply inverse transformation if log1p was used
target_transform = metadata.get('metrics', {}).get('target_transform')
if target_transform == 'log1p':
    y_pred_original = np.expm1(y_pred)
else:
    y_pred_original = y_pred

# Calculate metrics
mae = mean_absolute_error(y, y_pred_original)
rmse = np.sqrt(mean_squared_error(y, y_pred_original))
r2 = r2_score(y, y_pred_original)
mean_y = y.mean()
std_y = y.std()

print(f"\n--- Model Performance Metrics:")
print(f"  Mean Absolute Error (MAE):  {mae:.4f} seconds")
print(f"  Root Mean Squared Error (RMSE): {rmse:.4f} seconds")
print(f"  R² Score: {r2:.4f}")
print(f"  Target Mean: {mean_y:.2f} seconds, Std: {std_y:.2f} seconds")

# Create figure with subplots
fig = plt.figure(figsize=(18, 14))
fig.suptitle('Journey Time Model - Performance Analysis', fontsize=18, fontweight='bold', y=0.995)

# 1. Actual vs Predicted Scatter Plot
print("--- Creating visualization 1: Actual vs Predicted")
ax1 = plt.subplot(3, 3, 1)
ax1.scatter(y, y_pred_original, alpha=0.6, s=50, edgecolors='k', linewidth=0.5)
min_val = min(y.min(), y_pred_original.min())
max_val = max(y.max(), y_pred_original.max())
ax1.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Perfect Prediction')
ax1.set_xlabel('Actual Time (seconds)', fontsize=11, fontweight='bold')
ax1.set_ylabel('Predicted Time (seconds)', fontsize=11, fontweight='bold')
ax1.set_title('Actual vs Predicted', fontsize=12, fontweight='bold')
ax1.legend()
ax1.grid(True, alpha=0.3)

# 2. Residuals Plot
print("--- Creating visualization 2: Residuals")
ax2 = plt.subplot(3, 3, 2)
residuals = y - y_pred_original
ax2.scatter(y_pred_original, residuals, alpha=0.6, s=50, edgecolors='k', linewidth=0.5)
ax2.axhline(y=0, color='r', linestyle='--', lw=2)
ax2.set_xlabel('Predicted Time (seconds)', fontsize=11, fontweight='bold')
ax2.set_ylabel('Residuals (seconds)', fontsize=11, fontweight='bold')
ax2.set_title('Residuals Plot', fontsize=12, fontweight='bold')
ax2.grid(True, alpha=0.3)

# 3. Residuals Distribution
print("--- Creating visualization 3: Residuals Distribution")
ax3 = plt.subplot(3, 3, 3)
ax3.hist(residuals, bins=20, edgecolor='black', alpha=0.7, color='steelblue')
ax3.axvline(x=0, color='r', linestyle='--', lw=2)
ax3.set_xlabel('Residuals (seconds)', fontsize=11, fontweight='bold')
ax3.set_ylabel('Frequency', fontsize=11, fontweight='bold')
ax3.set_title(f'Residuals Distribution (Mean: {residuals.mean():.2f})', fontsize=12, fontweight='bold')
ax3.grid(True, alpha=0.3, axis='y')

# 4. Actual vs Predicted Distribution
print("--- Creating visualization 4: Distribution Comparison")
ax4 = plt.subplot(3, 3, 4)
ax4.hist(y, bins=20, alpha=0.6, label='Actual', edgecolor='black', color='green')
ax4.hist(y_pred_original, bins=20, alpha=0.6, label='Predicted', edgecolor='black', color='red')
ax4.set_xlabel('Time (seconds)', fontsize=11, fontweight='bold')
ax4.set_ylabel('Frequency', fontsize=11, fontweight='bold')
ax4.set_title('Actual vs Predicted Distribution', fontsize=12, fontweight='bold')
ax4.legend()
ax4.grid(True, alpha=0.3, axis='y')

# 5. Error Distribution
print("--- Creating visualization 5: Absolute Error Distribution")
ax5 = plt.subplot(3, 3, 5)
abs_errors = np.abs(residuals)
ax5.hist(abs_errors, bins=20, edgecolor='black', alpha=0.7, color='coral')
ax5.axvline(x=mae, color='r', linestyle='--', lw=2, label=f'MAE: {mae:.2f}s')
ax5.set_xlabel('Absolute Error (seconds)', fontsize=11, fontweight='bold')
ax5.set_ylabel('Frequency', fontsize=11, fontweight='bold')
ax5.set_title('Absolute Error Distribution', fontsize=12, fontweight='bold')
ax5.legend()
ax5.grid(True, alpha=0.3, axis='y')

# 6. Feature Importance
print("--- Creating visualization 6: Feature Importance")
ax6 = plt.subplot(3, 3, 6)
try:
    feature_importance_path = os.path.join(MODELS_PATH, "feature_importance.csv")
    if os.path.exists(feature_importance_path):
        fi_df = pd.read_csv(feature_importance_path)
        fi_df = fi_df.sort_values('importance', ascending=False).head(10)
        bars = ax6.barh(fi_df['feature'], fi_df['importance'], color='steelblue', edgecolor='black')
        ax6.set_xlabel('Importance', fontsize=11, fontweight='bold')
        ax6.set_title('Top 10 Feature Importance', fontsize=12, fontweight='bold')
        ax6.grid(True, alpha=0.3, axis='x')
        # Color the bars with gradient
        for i, bar in enumerate(bars):
            bar.set_color(plt.cm.viridis(i / len(bars)))
except Exception as e:
    ax6.text(0.5, 0.5, 'Feature importance not available', ha='center', va='center')

# 7. Model Performance Metrics Table
print("--- Creating visualization 7: Performance Metrics")
ax7 = plt.subplot(3, 3, 7)
ax7.axis('off')
metrics_data = [
    ['Metric', 'Value'],
    ['MAE (seconds)', f'{mae:.4f}'],
    ['RMSE (seconds)', f'{rmse:.4f}'],
    ['R² Score', f'{r2:.4f}'],
    ['MAPE (%)', f'{(np.mean(np.abs(residuals/y)) * 100):.2f}%'],
    ['Median Error (s)', f'{np.median(residuals):.2f}'],
    ['Std Dev Error (s)', f'{residuals.std():.2f}'],
    ['Min Error (s)', f'{residuals.min():.2f}'],
    ['Max Error (s)', f'{residuals.max():.2f}'],
    ['Dataset Size', f'{len(df)}'],
]
table = ax7.table(cellText=metrics_data, cellLoc='center', loc='center', 
                  colWidths=[0.5, 0.5])
table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1, 2.5)
# Header styling
for i in range(2):
    table[(0, i)].set_facecolor('#4472C4')
    table[(0, i)].set_text_props(weight='bold', color='white')
# Alternating row colors
for i in range(1, len(metrics_data)):
    for j in range(2):
        if i % 2 == 0:
            table[(i, j)].set_facecolor('#E7E6E6')
        else:
            table[(i, j)].set_facecolor('#F2F2F2')

# 8. Q-Q Plot (Quantile-Quantile)
print("--- Creating visualization 8: Q-Q Plot")
ax8 = plt.subplot(3, 3, 8)
from scipy import stats
stats.probplot(residuals, dist="norm", plot=ax8)
ax8.set_title('Q-Q Plot (Residuals vs Normal)', fontsize=12, fontweight='bold')
ax8.grid(True, alpha=0.3)

# 9. Prediction Error vs Actual Value
print("--- Creating visualization 9: Error vs Actual Value")
ax9 = plt.subplot(3, 3, 9)
ax9.scatter(y, abs_errors, alpha=0.6, s=50, edgecolors='k', linewidth=0.5, c=y, cmap='viridis')
ax9.set_xlabel('Actual Time (seconds)', fontsize=11, fontweight='bold')
ax9.set_ylabel('Absolute Error (seconds)', fontsize=11, fontweight='bold')
ax9.set_title('Error vs Actual Value', fontsize=12, fontweight='bold')
cbar = plt.colorbar(ax9.collections[0], ax=ax9)
cbar.set_label('Actual Time (s)', fontsize=10)
ax9.grid(True, alpha=0.3)

plt.tight_layout()

# Save figure
print("\n--- Saving visualization...")
output_path = os.path.join(MODELS_PATH, "model_performance_analysis.png")
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"✅ Saved to: {output_path}")

# Create separate time-series plots for better readability
if 'timestamp' in df.columns:
    print("\n--- Creating time-series performance plots...")
    df_sorted = df.sort_values('timestamp').reset_index(drop=True)
    y_sorted = y.iloc[df_sorted.index].reset_index(drop=True)
    y_pred_sorted = pd.Series(y_pred_original)[df_sorted.index].reset_index(drop=True)
    errors_sorted = y_sorted - y_pred_sorted
    
    # Plot 1: Actual vs Predicted over time
    fig2 = plt.figure(figsize=(16, 6))
    ax1 = plt.subplot(1, 1, 1)
    ax1.plot(y_sorted.values, 'o-', label='Actual', alpha=0.8, markersize=6, linewidth=2, color='green')
    ax1.plot(y_pred_sorted.values, 's-', label='Predicted', alpha=0.8, markersize=6, linewidth=2, color='red')
    ax1.fill_between(range(len(y_sorted)), y_sorted.values, y_pred_sorted.values, alpha=0.2, color='blue')
    ax1.set_xlabel('Prediction Index (chronological order)', fontsize=13, fontweight='bold')
    ax1.set_ylabel('Journey Time (seconds)', fontsize=13, fontweight='bold')
    ax1.set_title('Actual vs Predicted Journey Times Over Time', fontsize=14, fontweight='bold')
    ax1.legend(loc='best', fontsize=12)
    ax1.grid(True, alpha=0.3, linestyle='--')
    
    plt.tight_layout()
    ts_actual_pred_path = os.path.join(MODELS_PATH, "model_timeseries_actual_vs_predicted.png")
    plt.savefig(ts_actual_pred_path, dpi=300, bbox_inches='tight')
    print(f"✅ Saved to: {ts_actual_pred_path}")
    plt.close(fig2)
    
    # Plot 2: Error over time
    fig3 = plt.figure(figsize=(16, 6))
    ax2 = plt.subplot(1, 1, 1)
    colors = ['red' if x < 0 else 'green' for x in errors_sorted.values]
    ax2.bar(range(len(errors_sorted)), errors_sorted.values, color=colors, alpha=0.7, edgecolor='black', linewidth=0.5)
    ax2.axhline(y=0, color='black', linestyle='-', lw=2)
    ax2.axhline(y=mae, color='blue', linestyle='--', lw=2, label=f'MAE: {mae:.2f}s')
    ax2.axhline(y=-mae, color='blue', linestyle='--', lw=2)
    ax2.set_xlabel('Prediction Index (chronological order)', fontsize=13, fontweight='bold')
    ax2.set_ylabel('Prediction Error (seconds)', fontsize=13, fontweight='bold')
    ax2.set_title('Prediction Error Distribution Over Time', fontsize=14, fontweight='bold')
    ax2.legend(loc='best', fontsize=12)
    ax2.grid(True, alpha=0.3, axis='y', linestyle='--')
    
    plt.tight_layout()
    ts_error_path = os.path.join(MODELS_PATH, "model_timeseries_error.png")
    plt.savefig(ts_error_path, dpi=300, bbox_inches='tight')
    print(f"✅ Saved to: {ts_error_path}")
    plt.close(fig3)
    
    # Plot 3: Cumulative Error over time
    fig4 = plt.figure(figsize=(16, 6))
    ax3 = plt.subplot(1, 1, 1)
    cumulative_error = np.cumsum(np.abs(errors_sorted.values))
    ax3.plot(cumulative_error, 'o-', color='darkred', alpha=0.8, markersize=5, linewidth=2.5)
    ax3.fill_between(range(len(cumulative_error)), cumulative_error, alpha=0.3, color='red')
    ax3.set_xlabel('Prediction Index (chronological order)', fontsize=13, fontweight='bold')
    ax3.set_ylabel('Cumulative Absolute Error (seconds)', fontsize=13, fontweight='bold')
    ax3.set_title('Cumulative Error Over Time', fontsize=14, fontweight='bold')
    ax3.grid(True, alpha=0.3, linestyle='--')
    
    plt.tight_layout()
    ts_cumulative_path = os.path.join(MODELS_PATH, "model_timeseries_cumulative_error.png")
    plt.savefig(ts_cumulative_path, dpi=300, bbox_inches='tight')
    print(f"✅ Saved to: {ts_cumulative_path}")
    plt.close(fig4)

print("\n" + "=" * 70)
print("  ✅ PERFORMANCE VISUALIZATION COMPLETE")
print("=" * 70)
print(f"\nGenerated graphs:")
print(f"  1. Actual vs Predicted Scatter")
print(f"  2. Residuals Plot")
print(f"  3. Residuals Distribution")
print(f"  4. Actual vs Predicted Distribution")
print(f"  5. Absolute Error Distribution")
print(f"  6. Feature Importance")
print(f"  7. Performance Metrics Table")
print(f"  8. Q-Q Plot")
print(f"  9. Error vs Actual Value")
if 'timestamp' in df.columns:
    print(f"  10. Time-Series: Actual vs Predicted")
    print(f"  11. Time-Series: Prediction Error Distribution")
    print(f"  12. Time-Series: Cumulative Error")

print(f"\nOutput files:")
print(f"  - {output_path}")
if 'timestamp' in df.columns:
    print(f"  - {ts_actual_pred_path}")
    print(f"  - {ts_error_path}")
    print(f"  - {ts_cumulative_path}")
