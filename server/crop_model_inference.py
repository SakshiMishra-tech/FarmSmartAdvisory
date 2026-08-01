#!/usr/bin/env python3
"""
Crop Model Inference Script
Provides easy-to-use functions for making predictions with trained models
"""

import numpy as np
import pandas as pd
import pickle
import joblib
import os
from typing import Dict, List, Tuple, Union, Optional

class CropRecommendationPredictor:
    """Crop Recommendation Model Predictor"""
    
    def __init__(self, model_path: str = None, metadata_path: str = None):
        """
        Initialize the crop recommendation predictor
        
        Parameters:
        -----------
        model_path : str, optional
            Path to the trained model file (.pkl or .joblib)
        metadata_path : str, optional
            Path to the model metadata file
        """
        self.model = None
        self.metadata = None
        self.crop_names = None
        self.feature_names = None
        
        # Auto-detect model files if not provided
        if model_path is None:
            model_path = self._find_model_file('crop_recommendation')
        if metadata_path is None:
            metadata_path = self._find_metadata_file('crop_recommendation')
        
        self.load_model(model_path, metadata_path)
    
    def _find_model_file(self, model_type: str) -> str:
        """Find model file automatically"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        if model_type == 'crop_recommendation':
            possible_files = [
                "randomforest_crop_recommendation_model.pkl",
                "randomforest_crop_recommendation_model.joblib",
                os.path.join(base_dir, "randomforest_crop_recommendation_model.pkl"),
                os.path.join(base_dir, "randomforest_crop_recommendation_model.joblib")
            ]
        else:
            possible_files = [
                f"{model_type}_model.pkl",
                f"{model_type}_model.joblib"
            ]
        
        for file in possible_files:
            if os.path.exists(file):
                return file
            # Also try with full path
            full_path = os.path.join(base_dir, file)
            if os.path.exists(full_path):
                return full_path
        
        raise FileNotFoundError(f"No {model_type} model file found. Expected one of: {possible_files}")
    
    def _find_metadata_file(self, model_type: str) -> str:
        """Find metadata file automatically"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        possible_files = [
            f"{model_type}_model_metadata.pkl",
            f"randomforest_model_metadata.pkl",
            os.path.join(base_dir, f"randomforest_model_metadata.pkl")
        ]
        
        for file in possible_files:
            if os.path.exists(file):
                return file
            # Also try with full path
            full_path = os.path.join(base_dir, file)
            if os.path.exists(full_path):
                return full_path
        
        print(f"Warning: No {model_type} metadata file found")
        return None
    
    def load_model(self, model_path: str, metadata_path: str = None):
        """Load the trained model and metadata"""
        print(f"Loading model from: {model_path}")
        
        # Load model
        if model_path.endswith('.pkl'):
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
        elif model_path.endswith('.joblib'):
            self.model = joblib.load(model_path)
        else:
            raise ValueError("Model file must be .pkl or .joblib format")
        
        # Load metadata if available
        if metadata_path and os.path.exists(metadata_path):
            with open(metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
            self.crop_names = self.metadata.get('crop_names', [])
            self.feature_names = self.metadata.get('feature_names', [])
        else:
            # Try to get crop names from model
            if hasattr(self.model, 'classes_'):
                self.crop_names = list(self.model.classes_)
            else:
                # Default crop names from the model
                self.crop_names = [
                    'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans',
                    'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango',
                    'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya',
                    'coconut', 'cotton', 'jute', 'coffee'
                ]
            self.feature_names = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        
        print(f"Model loaded successfully!")
        print(f"Model type: {type(self.model).__name__}")
        print(f"Number of crop classes: {len(self.crop_names)}")
    
    def predict(self, N: float, P: float, K: float, temperature: float, 
                humidity: float, ph: float, rainfall: float) -> Dict:
        """
        Predict the best crop for given conditions
        
        Parameters:
        -----------
        N : float
            Nitrogen content in kg/ha (0-140)
        P : float
            Phosphorus content in kg/ha (5-145)
        K : float
            Potassium content in kg/ha (5-205)
        temperature : float
            Temperature in °C (8.8-43.7)
        humidity : float
            Humidity in % (14.3-99.9)
        ph : float
            pH level (3.5-9.9)
        rainfall : float
            Rainfall in mm (20.2-298.6)
        
        Returns:
        --------
        dict
            Prediction results with crop name, confidence, and top alternatives
        """
        # Validate inputs
        self._validate_inputs(N, P, K, temperature, humidity, ph, rainfall)
        
        # Prepare input data
        input_data = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
        
        # Make prediction
        prediction = self.model.predict(input_data)[0]
        prediction_proba = self.model.predict_proba(input_data)[0]
        
        # Get confidence and top alternatives
        confidence = np.max(prediction_proba)
        top_indices = np.argsort(prediction_proba)[-3:][::-1]
        
        result = {
            'predicted_crop': prediction,
            'confidence': float(confidence),
            'confidence_percentage': float(confidence * 100),
            'top_3_alternatives': []
        }
        
        for i, idx in enumerate(top_indices):
            if idx < len(self.crop_names):
                crop_name = self.crop_names[idx]
                prob = prediction_proba[idx]
                result['top_3_alternatives'].append({
                    'crop': crop_name,
                    'confidence': float(prob),
                    'confidence_percentage': float(prob * 100)
                })
        
        return result
    
    def _validate_inputs(self, N, P, K, temperature, humidity, ph, rainfall):
        """Validate input parameters"""
        if not (0 <= N <= 140):
            raise ValueError(f"N (Nitrogen) must be between 0-140, got {N}")
        if not (5 <= P <= 145):
            raise ValueError(f"P (Phosphorus) must be between 5-145, got {P}")
        if not (5 <= K <= 205):
            raise ValueError(f"K (Potassium) must be between 5-205, got {K}")
        if not (8.8 <= temperature <= 43.7):
            raise ValueError(f"Temperature must be between 8.8-43.7°C, got {temperature}")
        if not (14.3 <= humidity <= 99.9):
            raise ValueError(f"Humidity must be between 14.3-99.9%, got {humidity}")
        if not (3.5 <= ph <= 9.9):
            raise ValueError(f"pH must be between 3.5-9.9, got {ph}")
        if not (20.2 <= rainfall <= 3000):
            raise ValueError(f"Rainfall must be between 20.2-3000mm, got {rainfall}")

class CropYieldPredictor:
    """Crop Yield Prediction Model Predictor"""
    
    def __init__(self, model_path: str = None, metadata_path: str = None):
        """
        Initialize the crop yield predictor
        """
        self.model = None
        self.metadata = None
        
        # Auto-detect model files if not provided
        if model_path is None:
            model_path = self._find_model_file('crop_yield')
        if metadata_path is None:
            metadata_path = self._find_metadata_file('crop_yield')
        
        self.load_model(model_path, metadata_path)
    
    def _find_model_file(self, model_type: str) -> str:
        """Find model file automatically"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        if model_type == 'crop_yield':
            possible_files = [
                "decisiontree_crop_yield_model.pkl",
                "decisiontree_crop_yield_model.joblib",
                os.path.join(base_dir, "decisiontree_crop_yield_model.pkl"),
                os.path.join(base_dir, "decisiontree_crop_yield_model.joblib")
            ]
        else:
            possible_files = [
                f"{model_type}_model.pkl",
                f"{model_type}_model.joblib"
            ]
        
        for file in possible_files:
            if os.path.exists(file):
                return file
            # Also try with full path
            full_path = os.path.join(base_dir, file)
            if os.path.exists(full_path):
                return full_path
        
        raise FileNotFoundError(f"No {model_type} model file found. Expected one of: {possible_files}")
    
    def _find_metadata_file(self, model_type: str) -> str:
        """Find metadata file automatically"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        possible_files = [
            f"{model_type}_model_metadata.pkl",
            f"decisiontree_yield_model_metadata.pkl",
            os.path.join(base_dir, f"decisiontree_yield_model_metadata.pkl")
        ]
        
        for file in possible_files:
            if os.path.exists(file):
                return file
            # Also try with full path
            full_path = os.path.join(base_dir, file)
            if os.path.exists(full_path):
                return full_path
        
        print(f"Warning: No {model_type} metadata file found")
        return None
    
    def load_model(self, model_path: str, metadata_path: str = None):
        """Load the trained model and metadata"""
        print(f"Loading yield model from: {model_path}")
        
        # Load model
        if model_path.endswith('.pkl'):
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
        elif model_path.endswith('.joblib'):
            self.model = joblib.load(model_path)
        else:
            raise ValueError("Model file must be .pkl or .joblib format")
        
        # Load metadata if available
        if metadata_path and os.path.exists(metadata_path):
            with open(metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
        
        print(f"Yield model loaded successfully!")
        print(f"Model type: {type(self.model).__name__}")
    
    def predict(self, crop_year: int, area: float, district_name: str, 
                season: str, crop: str) -> Dict:
        """
        Predict crop yield for given conditions
        """
        # Basic yield calculation based on area
        # In a real implementation, this would use the actual preprocessing pipeline
        base_yield_per_hectare = 2.5  # tons per hectare (average)
        predicted_production = area * base_yield_per_hectare
        
        result = {
            'predicted_production': predicted_production,
            'predicted_yield': base_yield_per_hectare,
            'area': area,
            'crop': crop,
            'season': season,
            'district': district_name,
            'year': crop_year
        }
        
        return result