"""
__init__.py for JourneyModel package
"""

__version__ = "1.0.0"
__author__ = "NextStop Research Team"
__description__ = "AI-powered journey time prediction model for IoT bus tracking system"

from .prediction.predict import JourneyTimePredictor, predict_single

__all__ = [
    'JourneyTimePredictor',
    'predict_single'
]
