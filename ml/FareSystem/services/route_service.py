"""
Route Service
Business logic for route information
"""


class RouteService:
    """Service class for route information"""
    
    def __init__(self, fare_data):
        """
        Initialize RouteService with fare data
        
        Args:
            fare_data: Route fare data (loaded from route_177.json)
        """
        self.fare_data = fare_data
    
    def get_route_info(self):
        """
        Get complete route information
        
        Returns:
            Complete fare data including stages and fare matrix
        """
        return self.fare_data
    
    def get_stages(self):
        """
        Get list of all stages
        
        Returns:
            List of stage information
        """
        return self.fare_data.get('stages', [])
    
    def get_stage_by_id(self, stage_id):
        """
        Get specific stage information by ID
        
        Args:
            stage_id: Stage ID
        
        Returns:
            Stage dict or None if not found
        """
        stages = self.fare_data.get('stages', [])
        if 0 <= stage_id < len(stages):
            return stages[stage_id]
        return None
    
    def get_stage_by_name(self, stage_name):
        """
        Get stage information by name
        
        Args:
            stage_name: Stage name (English)
        
        Returns:
            Stage dict or None if not found
        """
        for stage in self.fare_data.get('stages', []):
            if stage.get('name') == stage_name:
                return stage
        return None
