import pandas as pd
import numpy as np
import os

DATA_FOLDER = 'data'
DATA_FILE = os.path.join(DATA_FOLDER, 'historical_crowd_data.csv')
START_DATE = '2025-10-01'

os.makedirs(DATA_FOLDER, exist_ok=True)
os.makedirs('models', exist_ok=True)

data = []
date_range = pd.to_datetime(pd.date_range(start=START_DATE, periods=60, freq='D'))
times = ['07:00:00', '07:30:00', '12:00:00', '17:00:00', '17:30:00']

for date in date_range:
    for time_str in times:
        count = 30
        if time_str in ['07:00:00', '17:00:00']: count += 25 # Peak
        if date.weekday() < 5: count += 10 # Weekday
        else: count -= 10 # Weekend
        
        crowd = int(np.clip(count + np.random.randint(-5, 5), 0, 100))
        data.append({'Date': date.strftime('%Y-%m-%d'), 'Turn_Time': time_str, 'Passenger_Count': crowd})

pd.DataFrame(data).to_csv(DATA_FILE, index=False)
print(f"✅ Data created at {DATA_FILE}")