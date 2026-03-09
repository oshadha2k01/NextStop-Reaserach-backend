import xgboost as xgb
import os
import pandas as pd
import warnings

class CrowdPredictor:
    def __init__(self):
        # The model is now expected to be in ml/CrowdPrediction/models
        self.model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'crowd_model.pkl')
        self.model = xgb.XGBRegressor()
        self.model.load_model(self.model_path)
        print(f"Crowd Prediction Model loaded from {self.model_path}")

    def get_crowd_status(self, passenger_count):
        if passenger_count <= 40:
            return {"status": "Low Crowd", "recommendation": "Perfect! You can go at this time. Seats are available.", "crowd_level": "comfortable"}
        elif passenger_count <= 54:
            return {"status": "Moderate Crowd", "recommendation": "Good time to travel. Most seats are occupied but still comfortable.", "crowd_level": "moderate"}
        elif passenger_count <= 65:
            return {"status": "Crowded", "recommendation": "Bus is crowded. You may need to stand. Consider alternative time if possible.", "crowd_level": "crowded"}
        else:
            return {"status": "Over Crowded", "recommendation": "Not recommended for this time in this route. Bus is over capacity. Please choose another time.", "crowd_level": "over_crowded"}

    def predict(self, date_str, time_str):
        if not self.model:
            raise ValueError("Crowd Prediction model is not loaded")

        dt = pd.to_datetime(f"{date_str} {time_str}")
        hour = dt.hour
        minute = dt.minute
        day_of_week = dt.dayofweek
        month = dt.month
        quarter = dt.quarter
        is_weekend = int(day_of_week >= 5)
        is_peak_morning = int(7 <= hour <= 9)
        is_peak_evening = int(17 <= hour <= 19)
        is_lunch_time = int(12 <= hour <= 14)
        is_early_morning = int(hour < 7)
        is_late_night = int(hour >= 20)
        is_winter = int(month in [12, 1, 2])
        is_summer = int(month in [6, 7, 8])

        # 1. Define the exact feature names used during training
        feature_names = [
            'hour', 'minute', 'day_of_week', 'month', 'quarter',
            'is_weekend', 'is_peak_morning', 'is_peak_evening', 'is_lunch_time',
            'is_early_morning', 'is_late_night', 'is_winter', 'is_summer'
        ]

        # 2. Construct a Pandas DataFrame instead of a standard list
        features_df = pd.DataFrame([[
            hour, minute, day_of_week, month, quarter,
            is_weekend, is_peak_morning, is_peak_evening, is_lunch_time,
            is_early_morning, is_late_night, is_winter, is_summer
        ]], columns=feature_names)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            # 3. Pass the DataFrame to the predict function
            predicted_crowd = int(self.model.predict(features_df)[0])

        predicted_crowd = max(0, min(100, predicted_crowd))
        crowd_info = self.get_crowd_status(predicted_crowd)

        return {
            "date": date_str,
            "day_of_week": dt.strftime('%A'),
            "time": time_str,
            "predicted_crowd": predicted_crowd,
            "status": crowd_info["status"],
            "recommendation": crowd_info["recommendation"],
            "crowd_level": crowd_info["crowd_level"]
        }
