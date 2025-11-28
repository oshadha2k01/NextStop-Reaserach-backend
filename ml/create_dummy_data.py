import pandas as pd
import numpy as np
import os
import json

DATA_FOLDER = 'data'
DATA_FILE = os.path.join(DATA_FOLDER, 'historical_crowd_data.csv')
START_DATE = '2010-01-01'  # Extended to 2010
END_DATE = '2025-05-29'

os.makedirs(DATA_FOLDER, exist_ok=True)
os.makedirs('models', exist_ok=True)

def get_crowd_status(passenger_count):
    """
    Determine crowd status based on Sri Lankan public bus capacity
    - Seats: 54
    - Full capacity (seats + standing): 65
    """
    if passenger_count <= 40:
        return {
            "status": "Low Crowd",
            "recommendation": "Perfect! You can go at this time. Seats are available.",
            "crowd_level": "comfortable"
        }
    elif passenger_count <= 54:
        return {
            "status": "Moderate Crowd",
            "recommendation": "Good time to travel. Most seats are occupied but still comfortable.",
            "crowd_level": "moderate"
        }
    elif passenger_count <= 65:
        return {
            "status": "Crowded",
            "recommendation": "Bus is crowded. You may need to stand. Consider alternative time if possible.",
            "crowd_level": "crowded"
        }
    else:
        return {
            "status": "Over Crowded",
            "recommendation": "Not recommended for this time in this route. Bus is over capacity. Please choose another time.",
            "crowd_level": "over_crowded"
        }

def format_prediction_output(date, time, passenger_count):
    """Format prediction output with crowd status and recommendation"""
    crowd_info = get_crowd_status(passenger_count)
    day_of_week = pd.to_datetime(date).strftime('%A')
    
    output = {
        "date": date,
        "day_of_week": day_of_week,
        "time": time,
        "predicted_crowd": passenger_count,
        "status": crowd_info["status"],
        "recommendation": crowd_info["recommendation"],
        "crowd_level": crowd_info["crowd_level"]
    }
    return output

data = []
# Calculate days between start and end date
date_range = pd.date_range(start=START_DATE, end=END_DATE, freq='D')
# Expanded time slots to cover entire day (every 30 minutes from 6 AM to 9 PM)
times = [
    '06:00:00', '06:30:00', '07:00:00', '07:30:00', '08:00:00', '08:30:00',
    '09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00',
    '12:00:00', '12:30:00', '13:00:00', '13:30:00', '14:00:00', '14:30:00',
    '15:00:00', '15:30:00', '16:00:00', '16:30:00', '17:00:00', '17:30:00',
    '18:00:00', '18:30:00', '19:00:00', '19:30:00', '20:00:00', '20:30:00',
    '21:00:00'
]

for date in date_range:
    for time_str in times:
        count = 30  # Base crowd
        
        is_weekday = date.weekday() < 5  # Monday-Friday
        
        if is_weekday:
            # WEEKDAY PATTERNS - High peaks during rush hours
            
            # VERY HIGH PEAK - Morning Rush (6:30-7:00 AM) - Highest morning crowd
            if time_str in ['06:30:00', '07:00:00']: 
                count += 40  # Maximum morning peak
            # High Morning Peak (7:30-8:30 AM) - Still crowded but less than 6:30-7:00
            elif time_str in ['07:30:00', '08:00:00', '08:30:00']: 
                count += 28
            # Normal Morning (9:00-11:30 AM) - Moderate crowd
            elif time_str in ['09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00']:
                count += 8
            # Lunch time (12:00-2:00 PM) - Moderate increase
            elif time_str in ['12:00:00', '12:30:00', '13:00:00', '13:30:00']: 
                count += 12
            # Normal Afternoon (2:30-3:30 PM) - Building up to evening peak
            elif time_str in ['14:30:00', '15:00:00', '15:30:00']:
                count += 10
            # VERY HIGH PEAK - Evening Rush (4:00-6:30 PM) - Highest evening crowd
            elif time_str in ['16:00:00', '16:30:00', '17:00:00', '17:30:00', '18:00:00', '18:30:00']: 
                count += 42  # Maximum evening peak (highest of all)
            # Late Evening (7:00-8:00 PM) - Declining crowd
            elif time_str in ['19:00:00', '19:30:00', '20:00:00']:
                count += 5
            # Late Night (8:30-9:00 PM) - Very few passengers
            elif time_str in ['20:30:00', '21:00:00']:
                count -= 12
            # Very Early Morning (6:00 AM) - Just starting
            elif time_str == '06:00:00':
                count += 5
            
            count += 12  # Weekday bonus
        
        else:
            # WEEKEND PATTERNS - Normal crowd all day, no peaks
            
            # Early Morning (6:00-7:00 AM) - Low crowd
            if time_str in ['06:00:00', '06:30:00', '07:00:00']:
                count -= 5
            # Mid Morning (7:30-11:30 AM) - Normal crowd
            elif time_str in ['07:30:00', '08:00:00', '08:30:00', '09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00']:
                count += 0  # Base level
            # Lunch/Afternoon (12:00-6:30 PM) - Slightly more activity
            elif time_str in ['12:00:00', '12:30:00', '13:00:00', '13:30:00', '14:00:00', '14:30:00', '15:00:00', '15:30:00', '16:00:00', '16:30:00', '17:00:00', '17:30:00', '18:00:00', '18:30:00']:
                count += 5  # Slightly more on weekends for shopping/leisure
            # Evening (7:00-9:00 PM) - Normal to low
            elif time_str in ['19:00:00', '19:30:00', '20:00:00', '20:30:00', '21:00:00']:
                count -= 5
            
            count -= 10  # Weekend reduction (less commuting)
        
        # Monthly variation (simulate seasonal patterns)
        if date.month in [12, 1, 2]:  # Winter - less crowding
            count -= 5
        elif date.month in [6, 7, 8]:  # Summer - more crowding
            count += 5
        elif date.month in [4, 5]:  # April-May (exam season) - slightly more
            count += 3
        
        # Year-based trend (slight increase over years)
        year_factor = (date.year - 2010) * 0.3
        count += year_factor
        
        crowd = int(np.clip(count + np.random.randint(-8, 8), 0, 100))
        data.append({'Date': date.strftime('%Y-%m-%d'), 'Turn_Time': time_str, 'Passenger_Count': crowd})

df = pd.DataFrame(data)
df.to_csv(DATA_FILE, index=False)
print(f" Data created at {DATA_FILE}")
print(f" Total records: {len(df):,}")
print(f" Date range: {df['Date'].min()} to {df['Date'].max()}")
