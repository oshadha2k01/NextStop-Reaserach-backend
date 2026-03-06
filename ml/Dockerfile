# Use official Python runtime as a parent image
FROM python:3.9-slim

# Install system dependencies for XGBoost and other libraries
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire ml directory into the container
COPY . .

# Expose the port the app runs on (matching prediction_api.py)
EXPOSE 5000

# Run the unified NextStop ML Service (FareSystem + JourneyModel)
CMD ["python", "app.py"]
