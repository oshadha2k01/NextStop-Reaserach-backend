"""
Fare Calculation Logic
Handles fare matrix lookups and calculations
"""


def calculate_fare_from_matrix(start_id, end_id, fare_matrix):
    """
    Calculate fare based on stage IDs using the fare matrix.
    Handles both forward and reverse journeys.
    
    Args:
        start_id: Starting stage ID
        end_id: Ending stage ID
        fare_matrix: Dictionary of fares (e.g., {"0_to_1": 27.0, ...})
    
    Returns:
        Fare amount in LKR
    """
    # Ensure start is always less than end for matrix lookup
    if start_id > end_id:
        start_id, end_id = end_id, start_id
    
    # Same stage = no fare
    if start_id == end_id:
        return 0.0
    
    # Try direct lookup in fare matrix
    fare_key = f"{start_id}_to_{end_id}"
    if fare_key in fare_matrix:
        return fare_matrix[fare_key]
    
    # If no direct fare, calculate cumulative fare
    # This handles long journeys by summing up intermediate fares
    total_fare = 0.0
    current_stage = start_id
    
    while current_stage < end_id:
        # Try direct route to destination first
        direct_key = f"{current_stage}_to_{end_id}"
        if direct_key in fare_matrix:
            total_fare += fare_matrix[direct_key]
            break
        
        # Otherwise, go to next immediate stage
        next_key = f"{current_stage}_to_{current_stage + 1}"
        if next_key in fare_matrix:
            total_fare += fare_matrix[next_key]
            current_stage += 1
        else:
            # Default single stage fare (27 LKR based on the matrix pattern)
            total_fare += 27.0
            current_stage += 1
    
    return total_fare
