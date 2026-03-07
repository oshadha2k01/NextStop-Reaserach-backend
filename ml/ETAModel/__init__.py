"""
__init__.py for ETAModel package
"""

__version__ = "1.0.0"
__author__ = "NextStop Research Team"
__description__ = "AI-powered ETA prediction model for bus arrival time estimation"

from .prediction.predict import ETAPredictor, predict_eta

__all__ = [
    'ETAPredictor',
    'predict_eta'
]