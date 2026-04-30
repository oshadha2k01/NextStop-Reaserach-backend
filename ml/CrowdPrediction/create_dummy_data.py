import pandas as pd
import numpy as np
import os
from datetime import datetime
import holidays

DATA_FOLDER = 'data'
DATA_FILE = os.path.join(DATA_FOLDER, 'historical_crowd_data.csv')
START_DATE = '2016-01-01'
END_DATE = '2026-01-30'

os.makedirs(DATA_FOLDER, exist_ok=True)
os.makedirs('models', exist_ok=True)

ROUTE_ID = 177
HOLIDAY_YEARS = list(range(pd.to_datetime(START_DATE).year, pd.to_datetime(END_DATE).year + 1))
SL_PUBLIC_HOLIDAYS = holidays.country_holidays('LK', years=HOLIDAY_YEARS)


def is_public_holiday(date_obj):
    """Use Sri Lanka official public holiday calendar (includes Poya and multi-religion dates)."""
    return int(date_obj.date() in SL_PUBLIC_HOLIDAYS)


def get_weather_rain_flag(month, rng):
    """Simple stochastic weather signal. Higher rain probability in monsoon periods."""
    monsoon_months = {5, 6, 10, 11}
    rain_probability = 0.35 if month in monsoon_months else 0.12
    return int(rng.random() < rain_probability)


def get_time_band_base_count(time_str, is_weekday, holiday_flag):
    """Return a base passenger count for the given day type and time band."""
    if holiday_flag:
        holiday_bands = {
            '05:30:00': 34,
            '06:00:00': 38,
            '06:30:00': 60,
            '07:00:00': 62,
            '07:30:00': 63,
            '08:00:00': 62,
            '08:30:00': 60,
            '09:00:00': 50,
            '09:30:00': 49,
            '10:00:00': 48,
            '10:30:00': 47,
            '11:00:00': 48,
            '11:30:00': 49,
            '12:00:00': 50,
            '12:30:00': 52,
            '13:00:00': 53,
            '13:30:00': 53,
            '14:00:00': 52,
            '14:30:00': 51,
            '15:00:00': 50,
            '15:30:00': 49,
            '16:00:00': 62,
            '16:30:00': 63,
            '17:00:00': 64,
            '17:30:00': 63,
            '18:00:00': 62,
            '18:30:00': 60,
            '19:00:00': 58,
            '19:30:00': 55,
            '20:00:00': 48,
            '20:30:00': 40,
            '21:00:00': 38
        }
        return holiday_bands.get(time_str, 45)

    if is_weekday:
        weekday_bands = {
            '05:30:00': 33,
            '06:00:00': 38,
            '06:30:00': 68,
            '07:00:00': 70,
            '07:30:00': 62,
            '08:00:00': 63,
            '08:30:00': 61,
            '09:00:00': 53,
            '09:30:00': 52,
            '10:00:00': 51,
            '10:30:00': 50,
            '11:00:00': 49,
            '11:30:00': 48,
            '12:00:00': 50,
            '12:30:00': 51,
            '13:00:00': 52,
            '13:30:00': 52,
            '14:00:00': 51,
            '14:30:00': 50,
            '15:00:00': 49,
            '15:30:00': 48,
            '16:00:00': 70,
            '16:30:00': 72,
            '17:00:00': 71,
            '17:30:00': 64,
            '18:00:00': 63,
            '18:30:00': 62,
            '19:00:00': 56,
            '19:30:00': 53,
            '20:00:00': 48,
            '20:30:00': 38,
            '21:00:00': 36
        }
        return weekday_bands.get(time_str, 45)

    weekend_bands = {
        '05:30:00': 32,
        '06:00:00': 34,
        '06:30:00': 36,
        '07:00:00': 38,
        '07:30:00': 40,
        '08:00:00': 42,
        '08:30:00': 43,
        '09:00:00': 45,
        '09:30:00': 46,
        '10:00:00': 47,
        '10:30:00': 48,
        '11:00:00': 49,
        '11:30:00': 50,
        '12:00:00': 52,
        '12:30:00': 53,
        '13:00:00': 54,
        '13:30:00': 54,
        '14:00:00': 55,
        '14:30:00': 55,
        '15:00:00': 54,
        '15:30:00': 53,
        '16:00:00': 52,
        '16:30:00': 51,
        '17:00:00': 50,
        '17:30:00': 48,
        '18:00:00': 46,
        '18:30:00': 45,
        '19:00:00': 42,
        '19:30:00': 40,
        '20:00:00': 38,
        '20:30:00': 35,
        '21:00:00': 33
    }
    return weekend_bands.get(time_str, 42)


def clamp_to_band(crowd):
    """Keep generated counts within the intended response band."""
    if crowd <= 40:
        return int(np.clip(crowd, 0, 40))
    if crowd <= 54:
        return int(np.clip(crowd, 41, 54))
    if crowd <= 65:
        return int(np.clip(crowd, 55, 65))
    return int(np.clip(crowd, 66, 100))


def enforce_expected_windows(crowd, time_str, is_weekday, holiday_flag):
    """Force key windows to match agreed status bands."""
    # Comfortable: very early morning across all day types.
    if '05:30:00' <= time_str <= '06:30:00':
        return int(np.clip(crowd, 0, 40))

    # Comfortable: late night across all day types
    if '20:30:00' <= time_str <= '21:00:00':
        return int(np.clip(crowd, 0, 40))

    # Holiday policy: avoid over-crowded peaks on public holidays.
    if holiday_flag:
        if ('06:30:00' <= time_str <= '08:30:00') or ('16:00:00' <= time_str <= '18:30:00'):
            return int(np.clip(crowd, 55, 65))
        if '09:00:00' <= time_str <= '15:30:00':
            return int(np.clip(crowd, 41, 54))

    # Comfortable: some weekend early mornings (non-holiday weekends)
    if (not holiday_flag) and (not is_weekday) and ('06:00:00' <= time_str <= '07:00:00'):
        return int(np.clip(crowd, 0, 40))

    # Weekday non-holiday windows
    if (not holiday_flag) and is_weekday:
        # Moderate: weekday mid-morning and lunch/afternoon
        if '09:00:00' <= time_str <= '15:30:00':
            return int(np.clip(crowd, 41, 54))

        # Crowded: weekday shoulder peaks
        if '07:30:00' <= time_str <= '08:30:00':
            return int(np.clip(crowd, 55, 65))
        if '17:30:00' <= time_str <= '18:30:00':
            return int(np.clip(crowd, 55, 65))

        # Over Crowded: strongest commute peaks
        if time_str in {'07:00:00', '16:00:00', '16:30:00', '17:00:00'}:
            return int(np.clip(crowd, 66, 100))

    return int(np.clip(crowd, 0, 100))

rng = np.random.default_rng(42)
data = []
# Calculate days between start and end date
date_range = pd.date_range(start=START_DATE, end=END_DATE, freq='D')
# Expanded time slots to cover entire day (every 30 minutes from 6 AM to 9 PM)
times = [
    '05:30:00', '06:00:00', '06:30:00', '07:00:00', '07:30:00', '08:00:00', '08:30:00',
    '09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00',
    '12:00:00', '12:30:00', '13:00:00', '13:30:00', '14:00:00', '14:30:00',
    '15:00:00', '15:30:00', '16:00:00', '16:30:00', '17:00:00', '17:30:00',
    '18:00:00', '18:30:00', '19:00:00', '19:30:00', '20:00:00', '20:30:00',
    '21:00:00'
]

for date in date_range:
    for direction in ['inbound', 'outbound']:
        for time_str in times:
            dt = datetime.strptime(f"{date.strftime('%Y-%m-%d')} {time_str}", '%Y-%m-%d %H:%M:%S')
            hour = dt.hour
            is_weekday = dt.weekday() < 5
            holiday_flag = is_public_holiday(dt)
            rain_flag = get_weather_rain_flag(dt.month, rng)

            count = get_time_band_base_count(time_str, is_weekday, holiday_flag)

            # Direction sensitivity: inbound bus to city center is busier in morning,
            # outbound bus is busier in evening.
            if direction == 'inbound' and 6 <= hour <= 10:
                count += 1 if holiday_flag else 4
            if direction == 'outbound' and 16 <= hour <= 20:
                count += 1 if holiday_flag else 4

            # Rain tends to shift passengers toward buses.
            if rain_flag:
                count += 1

            if date.month in [12, 1, 2]:
                count -= 1
            elif date.month in [6, 7, 8]:
                count += 1
            elif date.month in [4, 5]:
                count += 0

            year_factor = (date.year - 2016) * 0.05
            count += year_factor

            crowd = int(round(count + rng.integers(-1, 2)))
            crowd = enforce_expected_windows(crowd, time_str, is_weekday, holiday_flag)
            crowd = clamp_to_band(crowd)
            data.append({
                'Date': date.strftime('%Y-%m-%d'),
                'Turn_Time': time_str,
                'Route_ID': ROUTE_ID,
                'Direction': direction,
                'is_public_holiday': holiday_flag,
                'is_raining': rain_flag,
                'Passenger_Count': crowd
            })

df = pd.DataFrame(data)
df.to_csv(DATA_FILE, index=False)
print(f" Data created at {DATA_FILE}")
print(f" Total records: {len(df):,}")
print(f" Date range: {df['Date'].min()} to {df['Date'].max()}")
