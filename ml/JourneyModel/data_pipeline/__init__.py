"""
Initialize data_pipeline package
"""

from .mongodb_to_csv import generate_datasets

__all__ = [
    'generate_datasets'
]
