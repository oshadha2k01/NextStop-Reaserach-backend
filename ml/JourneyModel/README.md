# NextStop Journey Time Prediction System

Standardized research-grade ML system for predicting bus journey times using IoT and real-time traffic data.

## 🏗️ Architecture
1. **IoT Bus Device** - Reports real-time location and weather data.
2. **MongoDB** - Stores sensor readings and historical stop data.
3. **Data Pipeline** - Automatically generates CSV datasets for training.
4. **ML Model** - XGBoost regressor trained on historical patterns.
5. **Prediction API** - Integrated with Google Maps Distance Matrix for real-time traffic awareness.

## 📁 Project Structure
```text
nextstop-ai-model/
├── data_pipeline/      # MongoDB to CSV extraction
├── datasets/           # Raw and processed training data
├── models/             # Saved ML models (.pkl) and metadata
├── preprocessing/      # Data cleaning and merging
├── training/           # XGBoost training scripts
├── prediction/         # Flask API and predictor logic
├── utils/              # Feature engineering and utilities
├── requirements.txt    # Python dependencies
└── README.md           # Project documentation
```

## 🚀 Getting Started

### 1. Installation
```powershell
pip install -r requirements.txt
```

### 2. Prepare Data
Extract data from MongoDB and preprocess it:
```powershell
python data_pipeline/mongodb_to_csv.py
python preprocessing/preprocess_dataset.py
```

### 3. Training
Train the XGBoost model:
```powershell
python training/train_model.py
```

### 4. Run API
Start the prediction service:
```powershell
python prediction/prediction_api.py
```

## 🧪 Real-Time Features
- **Google Distance Matrix Integration**: Combines ML predictions with real-time Google Traffic data.
- **Route 177 Support**: Specialized stage-wise segmented traffic for Colombo's Route 177.
- **Automatic Retraining**: Watches MongoDB for new data to keep the model updated.
