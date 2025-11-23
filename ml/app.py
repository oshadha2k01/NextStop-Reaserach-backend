from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(_name_)
CORS(app)

MODEL = joblib.load('models/trained_model.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    date_str, time_str = data.get('date'), data.get('time')
    
    dt = pd.to_datetime(f"{date_str} {time_str}")
    
    input_df = pd.DataFrame([{
        'hour': dt.hour,
        'day_of_week': dt.weekday(),
        'month': dt.month,
        'day_of_year': dt.timetuple().tm_yday
    }])
    
    prediction = MODEL.predict(input_df)[0]
    
    return jsonify({
        'date': date_str,
        'time': time_str,
        'predicted_crowd': int(round(prediction)),
        'day_of_week': dt.strftime('%A')
    })

if _name_ == '_main_':
    # Flask ML Service on Port 5000
    app.run(port=5000, debug=True)