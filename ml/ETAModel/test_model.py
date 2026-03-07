"""
Test Script for ETAModel
Tests the ETA prediction functionality
"""

import sys
import os

# ensure ETAModel package is importable when running tests directly
base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, base)

from ETAModel.prediction.predict import ETAPredictor, predict_eta


def test_basic_prediction():
    """Test basic ETA prediction"""
    print("Testing basic ETA prediction...")

    predictor = ETAPredictor()

    # Test prediction
    eta = predictor.predict_eta(
        bus_lat=6.9271,      # Colombo center
        bus_lng=79.8612,
        user_lat=6.9171,     # Nearby location (~1km away)
        user_lng=79.8712,
        bus_speed_kmh=30,
        weather_was_raining=0
    )

    print(f"✅ ETA Prediction: {eta/60:.2f} minutes")

    # Test with explanation
    result = predictor.predict_with_explanation(
        bus_lat=6.9271,
        bus_lng=79.8612,
        user_lat=6.9171,
        user_lng=79.8712,
        bus_speed_kmh=30,
        weather_was_raining=0
    )

    print("✅ Detailed Prediction:")
    print(f"   ETA: {result['eta_minutes']} minutes")
    print(f"   Bus Location: {result['bus_location']}")
    print(f"   User Location: {result['user_location']}")
    print(f"   Weather: {result['weather']}")

    return True


def test_simple_function():
    """Test the simple prediction function"""
    print("\nTesting simple prediction function...")

    eta = predict_eta(
        bus_lat=6.9271,
        bus_lng=79.8612,
        user_lat=6.9171,
        user_lng=79.8712,
        bus_speed_kmh=25,
        weather_was_raining=1  # Rainy weather
    )

    print(f"✅ Simple ETA: {eta/60:.2f} minutes (with rain)")
    return True


def test_validation():
    """Test input validation"""
    print("\nTesting input validation...")

    predictor = ETAPredictor()

    # Test missing parameters
    try:
        predictor.predict_eta(
            bus_lat=None,
            bus_lng=79.8612,
            user_lat=6.9171,
            user_lng=79.8712
        )
        print("❌ Should have failed with missing bus_lat")
        return False
    except Exception as e:
        print(f"✅ Correctly caught validation error: {type(e).__name__}: {str(e)}")

    # Test invalid coordinates
    try:
        predictor.predict_eta(
            bus_lat=91,  # Invalid latitude
            bus_lng=79.8612,
            user_lat=6.9171,
            user_lng=79.8712
        )
        print("❌ Should have failed with invalid latitude")
        return False
    except Exception as e:
        print(f"✅ Correctly caught coordinate validation error: {type(e).__name__}: {str(e)}")

    return True


def test_fallback_calculation():
    """Test fallback calculation when model is not available"""
    print("\nTesting fallback calculation...")

    # Temporarily disable model
    predictor = ETAPredictor()
    original_model = predictor.model
    predictor.model = None

    eta = predictor.predict_eta(
        bus_lat=6.9271,
        bus_lng=79.8612,
        user_lat=6.9171,
        user_lng=79.8712,
        bus_speed_kmh=30
    )

    print(f"✅ Fallback ETA: {eta/60:.2f} minutes (no ML model)")

    # Restore model
    predictor.model = original_model

    return True


def main():
    """Run all tests"""
    print("="*60)
    print("  🧪 ETAMODEL TEST SUITE")
    print("="*60)

    tests = [
        test_basic_prediction,
        test_simple_function,
        test_validation,
        test_fallback_calculation
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print(f"❌ {test.__name__} failed")
        except Exception as e:
            print(f"❌ {test.__name__} crashed: {e}")

    print("\n" + "="*60)
    print(f"  TEST RESULTS: {passed}/{total} passed")
    print("="*60)

    if passed == total:
        print("🎉 All tests passed! ETAModel is ready to use.")
    else:
        print("⚠️  Some tests failed. Check the output above.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)