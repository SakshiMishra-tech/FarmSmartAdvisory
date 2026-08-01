#!/usr/bin/env python3
"""
Test script for FarmSmart Voice Assistant Backend
"""

import requests
import json
import time

def test_backend():
    """Test the voice assistant backend"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing FarmSmart Voice Assistant Backend")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1️⃣ Testing health check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test 2: Root endpoint
    print("\n2️⃣ Testing root endpoint...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("✅ Root endpoint working")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Root endpoint failed: {e}")
    
    # Test 3: Voice query - English
    print("\n3️⃣ Testing voice query (English)...")
    test_queries = [
        {"query": "What crops should I plant?", "language": "en"},
        {"query": "Tell me about soil", "language": "en"},
        {"query": "How to control pests?", "language": "en"},
        {"query": "When to harvest?", "language": "en"}
    ]
    
    for i, test_data in enumerate(test_queries, 1):
        try:
            response = requests.post(
                f"{base_url}/voice-query",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Test {i}: {test_data['query']}")
                print(f"   Response: {result['response'][:100]}...")
            else:
                print(f"❌ Test {i} failed: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Test {i} failed: {e}")
    
    # Test 4: Voice query - Hindi
    print("\n4️⃣ Testing voice query (Hindi)...")
    hindi_queries = [
        {"query": "कौन सी फसल लगाऊं?", "language": "hi"},
        {"query": "मिट्टी के बारे में बताओ", "language": "hi"}
    ]
    
    for i, test_data in enumerate(hindi_queries, 1):
        try:
            response = requests.post(
                f"{base_url}/voice-query",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Hindi Test {i}: {test_data['query']}")
                print(f"   Response: {result['response'][:100]}...")
            else:
                print(f"❌ Hindi Test {i} failed: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Hindi Test {i} failed: {e}")
    
    print("\n🎉 Backend testing completed!")
    return True

def main():
    """Main test function"""
    print("Starting backend test in 3 seconds...")
    print("Make sure the backend is running on http://localhost:8000")
    time.sleep(3)
    
    if test_backend():
        print("\n✅ All tests passed! Backend is working correctly.")
        print("\n🚀 You can now start the frontend and test the voice assistant!")
    else:
        print("\n❌ Some tests failed. Please check the backend logs.")

if __name__ == "__main__":
    main()

