# NextStop — Research & Production Repository

**Full Research Main Core** — This repository contains the NextStop research and production codebase for public-transport journey time prediction, ETA services, crowd prediction, fare calculation and related tooling. It includes backend API services, a frontend UI, machine learning research modules, and experiment/visualization tools used to develop and evaluate the Journey Time prediction model (XGBoost).

**Contents / Architecture**
- **backend/**: Express.js API and controllers that integrate prediction endpoints, route management, device registration and administrative dashboards. Key controllers are under [backend/controllers](backend/controllers) and routes under [backend/routes](backend/routes).
- **frontend/**: Vite + React single-page app used for dashboards and operator interfaces. See [frontend/src](frontend/src).
-- **ml/**: Research and production ML services. Subfolders include (not exhaustive):
  - `CrowdPrediction/` — crowd-counting and prediction experiments (create_dummy_data.py, train_model.py)
  - `ETAModel/` — ETA model experiments and APIs (data_collector.py, eta_api.py, train_model.py)
  - `FareSystem/` — fare calculation routes and services
  - `JourneyModel/` — journey-time preprocessing, training, prediction and visualization
  - `prediction/` — ML prediction routes and services
  - `utils/` — shared ML utilities and feature-engineering helpers
  - `data/` — ML datasets (main_bus_stops.json, route_177.json)
- **data/**: static route and stop data used for experiments and seeding the backend.

**Project Goals (Main Research Core)**
- Build and evaluate a robust Journey Time prediction model for buses using historical sensor data, route topology and contextual features (time, traffic, weather).
- Integrate the model into a real-time backend prediction API for ETA and driver/passenger features.
- Provide tooling for model retraining, drift detection, and visualization to support ongoing research and production monitoring.

# NextStop — Project Overview

This repository contains the full NextStop system: backend API, frontend UI, machine-learning services, data, and supporting components used for research and production of journey-time prediction and transit features.

## Components
- **backend/** — Node.js (Express) API, controllers, routes and models for prediction endpoints, device integration, admin dashboards and data ingestion.
- **frontend/** — Vite + React web app for dashboards and operator interfaces.
- **ml/** — Machine-learning services and experiments (training, prediction, visualization) including models for ETA, crowd prediction and journey-time forecasting.
- **data/** — Static route and stop datasets used for experiments and seeding.
- **dl/** — Deep-learning experiments and services (object detection / computer vision) and related Docker artifacts.
- **scripts, tools & devops** — Compose files, Dockerfiles, and helper scripts at the repository root for local development and deployment.

## Top-level folders
- `backend/`  
- `frontend/`  
- `ml/`  
- `data/`  
- `dl/`  
- `docker-compose.yml`, Dockerfiles and project-level scripts

If you want the full folder tree printed again (as a code block), I can add it back — or I can keep this concise overview with component list. Which do you prefer?
