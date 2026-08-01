# 🚀 Crop ML Models - Backend Integration Package

This folder contains the essential ML model files ready for backend integration.

## 📁 **Files Included**

### 🎯 **Crop Recommendation Model** (99.45% Accuracy)
- `randomforest_crop_recommendation_model.pkl` - Main model file
- `randomforest_crop_recommendation_model.joblib` - Alternative format
- `randomforest_model_metadata.pkl` - Model metadata

### 📊 **Crop Yield Prediction Model** (59% R² Score)
- `decisiontree_crop_yield_model.pkl` - Main model file
- `decisiontree_crop_yield_model.joblib` - Alternative format
- `decisiontree_yield_model_metadata.pkl` - Model metadata
- `feature_encoder.pkl` - Feature encoding info

### 🔧 **Integration Tools**
- `crop_model_inference.py` - Ready-to-use inference classes
- `requirements.txt` - Python dependencies
- `README_BACKEND_INTEGRATION.md` - This guide

---

## 🚀 **Quick Backend Integration**

### **1. Install Dependencies**
```bash
pip install -r requirements.txt
```

### **2. Flask API Example**
```python
from flask import Flask, request, jsonify
from crop_model_inference import CropRecommendationPredictor
import os

app = Flask(__name__)

# Initialize predictor (auto-detects model files)
predictor = CropRecommendationPredictor()

@app.route('/predict-crop', methods=['POST'])
def predict_crop():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Make prediction
        result = predictor.predict(**data)
        
        return jsonify({
            'success': True,
            'predicted_crop': result['predicted_crop'],
            'confidence': result['confidence_percentage'],
            'alternatives': result['top_3_alternatives']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'models_loaded': True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

### **3. FastAPI Example**
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from crop_model_inference import CropRecommendationPredictor
from typing import List, Dict

app = FastAPI(title="Crop Prediction API", version="1.0.0")

# Initialize predictor
predictor = CropRecommendationPredictor()

class CropPredictionRequest(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

class CropPredictionResponse(BaseModel):
    predicted_crop: str
    confidence: float
    alternatives: List[Dict[str, float]]

@app.post("/predict-crop", response_model=CropPredictionResponse)
async def predict_crop(request: CropPredictionRequest):
    try:
        result = predictor.predict(**request.dict())
        
        return CropPredictionResponse(
            predicted_crop=result['predicted_crop'],
            confidence=result['confidence_percentage'],
            alternatives=result['top_3_alternatives']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### **4. Django Integration**
```python
# models.py
from django.db import models

class CropPrediction(models.Model):
    n = models.FloatField()
    p = models.FloatField()
    k = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    ph = models.FloatField()
    rainfall = models.FloatField()
    predicted_crop = models.CharField(max_length=100)
    confidence = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from crop_model_inference import CropRecommendationPredictor

predictor = CropRecommendationPredictor()

@csrf_exempt
@require_http_methods(["POST"])
def predict_crop(request):
    try:
        data = json.loads(request.body)
        result = predictor.predict(**data)
        
        # Save to database
        CropPrediction.objects.create(
            n=data['N'], p=data['P'], k=data['K'],
            temperature=data['temperature'], humidity=data['humidity'],
            ph=data['ph'], rainfall=data['rainfall'],
            predicted_crop=result['predicted_crop'],
            confidence=result['confidence_percentage']
        )
        
        return JsonResponse({
            'success': True,
            'predicted_crop': result['predicted_crop'],
            'confidence': result['confidence_percentage']
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
```

---

## 📋 **Input Requirements**

### **Crop Recommendation Model**
```json
{
  "N": 120,           // Nitrogen (0-140 kg/ha)
  "P": 80,            // Phosphorus (5-145 kg/ha)
  "K": 60,            // Potassium (5-205 kg/ha)
  "temperature": 22.5, // Temperature (8.8-43.7°C)
  "humidity": 65,     // Humidity (14.3-99.9%)
  "ph": 7.2,          // pH (3.5-9.9)
  "rainfall": 450     // Rainfall (20.2-3000mm)
}
```

### **Response Format**
```json
{
  "success": true,
  "predicted_crop": "rice",
  "confidence": 95.2,
  "alternatives": [
    {"crop": "rice", "confidence": 95.2},
    {"crop": "maize", "confidence": 3.1},
    {"crop": "wheat", "confidence": 1.7}
  ]
}
```

---

## 🎯 **Supported Crops** (22 types)
rice, maize, chickpea, kidneybeans, pigeonpeas, mothbeans, mungbean, blackgram, lentil, pomegranate, banana, mango, grapes, watermelon, muskmelon, apple, orange, papaya, coconut, cotton, jute, coffee

---

## 🔧 **Simple Usage (No Framework)**
```python
from crop_model_inference import CropRecommendationPredictor

# Initialize
predictor = CropRecommendationPredictor()

# Make prediction
result = predictor.predict(
    N=120, P=80, K=60, temperature=22.5,
    humidity=65, ph=7.2, rainfall=450
)

print(f"Crop: {result['predicted_crop']}")
print(f"Confidence: {result['confidence_percentage']:.1f}%")
```

---

## ✅ **Ready for Production!**

All files in this folder are production-ready and can be:
- ✅ Deployed to any cloud platform
- ✅ Integrated into existing backends
- ✅ Used in microservices
- ✅ Scaled horizontally
- ✅ Containerized with Docker

**🎉 Your ML models are ready for backend integration!**
