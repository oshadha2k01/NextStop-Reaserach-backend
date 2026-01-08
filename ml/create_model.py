import os
import joblib
from sklearn.linear_model import LinearRegression
import numpy as np

# Create the 'models' directory if it doesn't exist
if not os.path.exists('models'):
    os.makedirs('models')
    print("✅ Created 'models/' directory")

# Create a simple dummy model for initial testing
X = np.array([[10], [20], [30], [40], [50]]) 
y = np.array([100, 200, 300, 400, 500]) 

model = LinearRegression()
model.fit(X, y)

# Save the model
model_path = 'models/trained_model.pkl'
joblib.dump(model, model_path)

print(f"✅ Dummy model saved to {model_path}")