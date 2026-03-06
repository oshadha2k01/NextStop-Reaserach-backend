"""
FareSystem Routes
Flask blueprints for fare-related endpoints
"""
from .fare_routes import fare_bp
from .route_routes import route_bp

__all__ = ['fare_bp', 'route_bp']
