#!/usr/bin/env python3
"""
ML Service Mock Implementation
Handles crop recommendation and yield prediction with built-in logic
"""

import json
import sys
from typing import Dict, List

class MLService:
    def __init__(self):
        # Crop recommendation rules based on soil conditions
        self.crop_rules = {
            'rice': {'N': (80, 120), 'P': (40, 60), 'K': (40, 60), 'ph': (5.5, 7.0), 'temp': (20, 35), 'humidity': (70, 95), 'rainfall': (1000, 3000)},
            'maize': {'N': (70, 110), 'P': (30, 50), 'K': (30, 50), 'ph': (6.0, 7.5), 'temp': (15, 35), 'humidity': (60, 90), 'rainfall': (500, 1500)},
            'wheat': {'N': (100, 140), 'P': (50, 70), 'K': (50, 70), 'ph': (6.0, 7.5), 'temp': (10, 25), 'humidity': (50, 80), 'rainfall': (300, 800)},
            'chickpea': {'N': (20, 40), 'P': (40, 60), 'K': (30, 50), 'ph': (6.0, 7.5), 'temp': (15, 30), 'humidity': (60, 85), 'rainfall': (300, 600)},
            'cotton': {'N': (100, 140), 'P': (40, 60), 'K': (40, 60), 'ph': (6.0, 8.0), 'temp': (20, 35), 'humidity': (50, 80), 'rainfall': (500, 1200)},
            'sugarcane': {'N': (120, 140), 'P': (50, 80), 'K': (60, 80), 'ph': (6.0, 7.5), 'temp': (20, 35), 'humidity': (70, 95), 'rainfall': (1000, 2500)},
            'tomato': {'N': (80, 120), 'P': (60, 80), 'K': (50, 70), 'ph': (6.0, 7.0), 'temp': (15, 30), 'humidity': (60, 85), 'rainfall': (400, 800)},
            'potato': {'N': (80, 120), 'P': (50, 70), 'K': (60, 80), 'ph': (5.5, 6.5), 'temp': (15, 25), 'humidity': (60, 85), 'rainfall': (500, 1000)},
            'onion': {'N': (60, 100), 'P': (40, 60), 'K': (50, 70), 'ph': (6.0, 7.5), 'temp': (15, 30), 'humidity': (60, 80), 'rainfall': (300, 700)},
            'banana': {'N': (100, 140), 'P': (50, 80), 'K': (80, 120), 'ph': (5.5, 7.0), 'temp': (25, 35), 'humidity': (75, 95), 'rainfall': (1000, 2000)}
        }
    
    def calculate_crop_score(self, crop: str, soil_data: Dict) -> float:
        """Calculate how well soil conditions match crop requirements"""
        if crop not in self.crop_rules:
            return 0.0
        
        rules = self.crop_rules[crop]
        score = 0.0
        total_factors = 0
        
        for factor, (min_val, max_val) in rules.items():
            if factor == 'temp':
                value = soil_data['temperature']
            elif factor in soil_data:
                value = soil_data[factor]
            else:
                continue
            
            total_factors += 1
            if min_val <= value <= max_val:
                score += 1.0
            elif value < min_val:
                score += max(0, 1 - (min_val - value) / min_val)
            else:
                score += max(0, 1 - (value - max_val) / max_val)
        
        return score / total_factors if total_factors > 0 else 0.0

    def predict_crop(self, soil_data: Dict) -> Dict:
        """
        Predict crop recommendation based on soil conditions
        """
        try:
            # Calculate scores for all crops
            crop_scores = {}
            for crop in self.crop_rules.keys():
                crop_scores[crop] = self.calculate_crop_score(crop, soil_data)
            
            # Sort crops by score
            sorted_crops = sorted(crop_scores.items(), key=lambda x: x[1], reverse=True)
            
            # Get top 3 recommendations
            top_3 = sorted_crops[:3]
            predicted_crop = top_3[0][0]
            confidence = top_3[0][1]
            
            result = {
                'predicted_crop': predicted_crop,
                'confidence': confidence,
                'confidence_percentage': confidence * 100,
                'top_3_alternatives': [
                    {
                        'crop': crop,
                        'confidence': score,
                        'confidence_percentage': score * 100
                    } for crop, score in top_3
                ]
            }
            
            # Generate advisory based on the predicted crop
            advisory = self.generate_advisory(predicted_crop, soil_data)
            result['advisory'] = advisory
            
            return result
        except Exception as e:
            raise Exception(f"Crop prediction failed: {str(e)}")
    
    def predict_yield(self, yield_data: Dict) -> Dict:
        """
        Predict crop yield based on crop type, area and season
        """
        try:
            crop = yield_data['crop'].lower()
            area = yield_data['area']
            season = yield_data['season']
            
            # Base yield per hectare for different crops (tons/ha)
            base_yields = {
                'rice': 4.5, 'wheat': 3.2, 'maize': 3.8, 'cotton': 1.8, 
                'sugarcane': 75.0, 'chickpea': 1.5, 'potato': 25.0,
                'tomato': 30.0, 'onion': 20.0, 'banana': 40.0
            }
            
            # Season multipliers
            season_multipliers = {
                'Kharif': 1.1,  # Better for rice, cotton
                'Rabi': 1.0,    # Standard for wheat, chickpea
                'Summer': 0.9   # Lower yields due to heat stress
            }
            
            base_yield = base_yields.get(crop, 2.5)  # Default 2.5 tons/ha
            season_mult = season_multipliers.get(season, 1.0)
            
            # Apply season multiplier
            predicted_yield = base_yield * season_mult
            predicted_production = area * predicted_yield
            
            result = {
                'predicted_production': predicted_production,
                'predicted_yield': predicted_yield,
                'area': area,
                'crop': crop,
                'season': season,
                'district': yield_data.get('district', ''),
                'year': yield_data['year']
            }
            
            return result
        except Exception as e:
            raise Exception(f"Yield prediction failed: {str(e)}")
    
    def generate_advisory(self, crop: str, soil_data: Dict) -> List[Dict]:
        """
        Generate farming advisory based on crop and soil conditions
        """
        advisory = []
        
        # Irrigation advisory
        if soil_data['rainfall'] < 200:
            advisory.append({
                'type': 'irrigation',
                'title': 'Irrigation',
                'description': f'Apply 150-200mm water per week during flowering stage for {crop}'
            })
        else:
            advisory.append({
                'type': 'irrigation',
                'title': 'Irrigation',
                'description': f'Monitor soil moisture. Reduce irrigation if rainfall is adequate'
            })
        
        # Fertilizer advisory
        if soil_data['N'] < 50:
            advisory.append({
                'type': 'fertilizer',
                'title': 'Fertilizer',
                'description': 'Add 15-20kg Urea per acre. Soil nitrogen is low'
            })
        elif soil_data['P'] < 20:
            advisory.append({
                'type': 'fertilizer',
                'title': 'Fertilizer',
                'description': 'Add 10kg DAP per acre. Phosphorus levels need improvement'
            })
        else:
            advisory.append({
                'type': 'fertilizer',
                'title': 'Fertilizer',
                'description': 'Maintain current fertilizer schedule. Soil nutrients are adequate'
            })
        
        # Pest control advisory
        pest_advice = {
            'rice': 'Monitor for stem borer and brown planthopper. Use pheromone traps',
            'wheat': 'Watch for aphids and rust diseases. Apply fungicides if needed',
            'maize': 'Check for fall armyworm. Use biological control agents',
            'cotton': 'Monitor for bollworm and whitefly. Use integrated pest management',
            'tomato': 'Watch for fruit borer and early blight. Use resistant varieties',
            'potato': 'Monitor for late blight and Colorado potato beetle',
            'chickpea': 'Check for pod borer and wilt disease. Use resistant varieties'
        }
        
        pest_desc = pest_advice.get(crop, 'Regular field inspection recommended. Use organic pesticides when necessary')
        advisory.append({
            'type': 'pest',
            'title': 'Pest Control',
            'description': pest_desc
        })
        
        return advisory

# Global ML service instance
ml_service = MLService()

# Main execution for command line usage
if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        if 'soilData' in input_data:
            # Crop prediction
            result = ml_service.predict_crop(input_data['soilData'])
        elif 'yieldData' in input_data:
            # Yield prediction
            result = ml_service.predict_yield(input_data['yieldData'])
        else:
            result = {"error": "Invalid input data"}
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
