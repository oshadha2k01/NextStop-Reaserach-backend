import joblib
import os

model_path = "./models/journey_time_model.pkl"

if os.path.exists(model_path):
    print(f"Loading model: {model_path}")
    model = joblib.load(model_path)
    
    print(f"\nModel type: {type(model).__name__}")
    print(f"Model params: {model.get_params()}")
    
    # Check if model has feature_names attribute
    if hasattr(model, 'feature_names_in_'):
        print(f"\n=== MODEL FEATURE NAMES ===")
        print(f"Total features in model: {len(model.feature_names_in_)}")
        for i, f in enumerate(model.feature_names_in_, 1):
            print(f"  {i:2d}. {f}")
    else:
        print("\nModel does NOT have feature_names_in_ attribute")
        
    if hasattr(model, 'feature_importance'):
        print(f"\nFeature importances shape: {model.feature_importance}")
        
else:
    print(f"Model not found at {model_path}")
