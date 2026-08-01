/**
 * ML Service - JavaScript Implementation
 * Provides crop recommendation and yield prediction logic
 */

class MLService {
  constructor() {
    // Crop recommendation rules based on soil conditions
    this.cropRules = {
      'rice': { N: [80, 120], P: [40, 60], K: [40, 60], ph: [5.5, 7.0], temp: [20, 35], humidity: [70, 95], rainfall: [1000, 3000] },
      'maize': { N: [70, 110], P: [30, 50], K: [30, 50], ph: [6.0, 7.5], temp: [15, 35], humidity: [60, 90], rainfall: [500, 1500] },
      'wheat': { N: [100, 140], P: [50, 70], K: [50, 70], ph: [6.0, 7.5], temp: [10, 25], humidity: [50, 80], rainfall: [300, 800] },
      'chickpea': { N: [20, 40], P: [40, 60], K: [30, 50], ph: [6.0, 7.5], temp: [15, 30], humidity: [60, 85], rainfall: [300, 600] },
      'cotton': { N: [100, 140], P: [40, 60], K: [40, 60], ph: [6.0, 8.0], temp: [20, 35], humidity: [50, 80], rainfall: [500, 1200] },
      'sugarcane': { N: [120, 140], P: [50, 80], K: [60, 80], ph: [6.0, 7.5], temp: [20, 35], humidity: [70, 95], rainfall: [1000, 2500] },
      'tomato': { N: [80, 120], P: [60, 80], K: [50, 70], ph: [6.0, 7.0], temp: [15, 30], humidity: [60, 85], rainfall: [400, 800] },
      'potato': { N: [80, 120], P: [50, 70], K: [60, 80], ph: [5.5, 6.5], temp: [15, 25], humidity: [60, 85], rainfall: [500, 1000] },
      'onion': { N: [60, 100], P: [40, 60], K: [50, 70], ph: [6.0, 7.5], temp: [15, 30], humidity: [60, 80], rainfall: [300, 700] },
      'banana': { N: [100, 140], P: [50, 80], K: [80, 120], ph: [5.5, 7.0], temp: [25, 35], humidity: [75, 95], rainfall: [1000, 2000] }
    };
  }

  calculateCropScore(crop, soilData) {
    if (!this.cropRules[crop]) return 0.0;

    const rules = this.cropRules[crop];
    let score = 0.0;
    let totalFactors = 0;

    for (const [factor, [minVal, maxVal]] of Object.entries(rules)) {
      let value;
      if (factor === 'temp') {
        value = soilData.temperature;
      } else if (soilData[factor] !== undefined) {
        value = soilData[factor];
      } else {
        continue;
      }

      totalFactors += 1;
      if (value >= minVal && value <= maxVal) {
        score += 1.0;
      } else if (value < minVal) {
        score += Math.max(0, 1 - (minVal - value) / minVal);
      } else {
        score += Math.max(0, 1 - (value - maxVal) / maxVal);
      }
    }

    return totalFactors > 0 ? score / totalFactors : 0.0;
  }

  predictCrop(soilData) {
    try {
      // Calculate scores for all crops
      const cropScores = {};
      for (const crop of Object.keys(this.cropRules)) {
        cropScores[crop] = this.calculateCropScore(crop, soilData);
      }

      // Sort crops by score
      const sortedCrops = Object.entries(cropScores).sort((a, b) => b[1] - a[1]);

      // Get top 3 recommendations
      const top3 = sortedCrops.slice(0, 3);
      const [predictedCrop, confidence] = top3[0];

      const result = {
        predicted_crop: predictedCrop,
        confidence,
        confidence_percentage: confidence * 100,
        top_3_alternatives: top3.map(([crop, score]) => ({
          crop,
          confidence: score,
          confidence_percentage: score * 100
        }))
      };

      // Generate advisory based on the predicted crop
      const advisory = this.generateAdvisory(predictedCrop, soilData);
      result.advisory = advisory;

      return result;
    } catch (error) {
      throw new Error(`Crop prediction failed: ${error.message}`);
    }
  }

  predictYield(yieldData) {
    try {
      const crop = yieldData.crop.toLowerCase();
      const area = yieldData.area;
      const season = yieldData.season;

      // Base yield per hectare for different crops (tons/ha)
      const baseYields = {
        rice: 4.5, wheat: 3.2, maize: 3.8, cotton: 1.8,
        sugarcane: 75.0, chickpea: 1.5, potato: 25.0,
        tomato: 30.0, onion: 20.0, banana: 40.0
      };

      // Season multipliers
      const seasonMultipliers = {
        'Kharif': 1.1,  // Better for rice, cotton
        'Rabi': 1.0,    // Standard for wheat, chickpea
        'Summer': 0.9   // Lower yields due to heat stress
      };

      const baseYield = baseYields[crop] || 2.5; // Default 2.5 tons/ha
      const seasonMult = seasonMultipliers[season] || 1.0;

      // Apply season multiplier
      const predictedYield = baseYield * seasonMult;
      const predictedProduction = area * predictedYield;

      return {
        predicted_production: predictedProduction,
        predicted_yield: predictedYield,
        area,
        crop,
        season,
        district: yieldData.district || '',
        year: yieldData.year
      };
    } catch (error) {
      throw new Error(`Yield prediction failed: ${error.message}`);
    }
  }

  generateAdvisory(crop, soilData) {
    const advisory = [];

    // Irrigation advisory
    if (soilData.rainfall < 200) {
      advisory.push({
        type: 'irrigation',
        title: 'Irrigation',
        description: `Apply 150-200mm water per week during flowering stage for ${crop}`
      });
    } else {
      advisory.push({
        type: 'irrigation',
        title: 'Irrigation',
        description: 'Monitor soil moisture. Reduce irrigation if rainfall is adequate'
      });
    }

    // Fertilizer advisory
    if (soilData.N < 50) {
      advisory.push({
        type: 'fertilizer',
        title: 'Fertilizer',
        description: 'Add 15-20kg Urea per acre. Soil nitrogen is low'
      });
    } else if (soilData.P < 20) {
      advisory.push({
        type: 'fertilizer',
        title: 'Fertilizer',
        description: 'Add 10kg DAP per acre. Phosphorus levels need improvement'
      });
    } else {
      advisory.push({
        type: 'fertilizer',
        title: 'Fertilizer',
        description: 'Maintain current fertilizer schedule. Soil nutrients are adequate'
      });
    }

    // Pest control advisory
    const pestAdvice = {
      rice: 'Monitor for stem borer and brown planthopper. Use pheromone traps',
      wheat: 'Watch for aphids and rust diseases. Apply fungicides if needed',
      maize: 'Check for fall armyworm. Use biological control agents',
      cotton: 'Monitor for bollworm and whitefly. Use integrated pest management',
      tomato: 'Watch for fruit borer and early blight. Use resistant varieties',
      potato: 'Monitor for late blight and Colorado potato beetle',
      chickpea: 'Check for pod borer and wilt disease. Use resistant varieties'
    };

    const pestDesc = pestAdvice[crop] || 'Regular field inspection recommended. Use organic pesticides when necessary';
    advisory.push({
      type: 'pest',
      title: 'Pest Control',
      description: pestDesc
    });

    return advisory;
  }
}

// Export singleton instance
const mlService = new MLService();
module.exports = mlService;