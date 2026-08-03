import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFarmerSchema, insertCropPredictionSchema, insertYieldPredictionSchema, insertCalamityPredictionSchema, insertSoilHealthReportSchema, insertWeatherLookupSchema } from "@shared/schema";
import path from "path";
import { handleClearConversations, handleGetConversations, handleVoiceQuery } from "./voice-assistant";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// JavaScript ML service inline implementation
class MLService {
  cropRules: Record<string, { N: number[]; P: number[]; K: number[]; ph: number[]; temp: number[]; humidity: number[]; rainfall: number[] }>;

  constructor() {
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

  calculateCropScore(crop: string, soilData: any) {
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

  predictCrop(soilData: any) {
    const cropScores: Record<string, number> = {};
    for (const crop of Object.keys(this.cropRules)) {
      cropScores[crop] = this.calculateCropScore(crop, soilData);
    }

    const sortedCrops = Object.entries(cropScores).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
    const top6 = sortedCrops.slice(0, 6);
    const [predictedCrop, confidence] = top6[0];

    return {
      predicted_crop: predictedCrop,
      confidence,
      confidence_percentage: (confidence as number) * 100,
      alternatives: top6.map(([crop, score]: any) => ({
        crop,
        confidence: score,
        confidence_percentage: score * 100
      })),
      advisory: this.generateAdvisory(predictedCrop, soilData)
    };
  }

  predictYield(yieldData: any) {
    const crop = yieldData.crop.toLowerCase();
    const area = yieldData.area;
    const season = yieldData.season;

    const baseYields = {
      rice: 4.5, wheat: 3.2, maize: 3.8, cotton: 1.8,
      sugarcane: 75.0, chickpea: 1.5, potato: 25.0,
      tomato: 30.0, onion: 20.0, banana: 40.0
    };

    const seasonMultipliers = {
      'Kharif': 1.1, 'Rabi': 1.0, 'Summer': 0.9
    };

    const baseYield = baseYields[crop] || 2.5;
    const seasonMult = seasonMultipliers[season] || 1.0;
    const predictedYield = baseYield * seasonMult;
    const predictedProduction = area * predictedYield;

    return {
      predicted_production: predictedProduction,
      predicted_yield: predictedYield,
      area, crop, season,
      district: yieldData.district || '',
      year: yieldData.year
    };
  }

  generateAdvisory(crop: string, soilData: any) {
    const advisory = [];

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

    if (soilData.N < 50) {
      advisory.push({
        type: 'fertilizer',
        title: 'Fertilizer',
        description: 'Add 15-20kg Urea per acre. Soil nitrogen is low'
      });
    } else {
      advisory.push({
        type: 'fertilizer',
        title: 'Fertilizer',
        description: 'Maintain current fertilizer schedule. Soil nutrients are adequate'
      });
    }

    const pestAdvice = {
      rice: 'Monitor for stem borer and brown planthopper. Use pheromone traps',
      wheat: 'Watch for aphids and rust diseases. Apply fungicides if needed',
      maize: 'Check for fall armyworm. Use biological control agents',
      cotton: 'Monitor for bollworm and whitefly. Use integrated pest management'
    };

    advisory.push({
      type: 'pest',
      title: 'Pest Control',
      description: pestAdvice[crop] || 'Regular field inspection recommended'
    });

    return advisory;
  }

  // NEW: Calamity Prediction Method
  predictCalamity(weatherData: any, soilData: any, crop: string) {
    try {
      const calamities = [];
      let overallRisk = 'LOW';
      let riskScore = 0;

      // Drought Risk Assessment
      if (weatherData.rainfall < 200) {
        calamities.push({
          type: 'DROUGHT',
          severity: weatherData.rainfall < 100 ? 'HIGH' : 'MEDIUM',
          probability: weatherData.rainfall < 100 ? 0.9 : 0.7,
          description: 'Low rainfall detected - drought risk high',
          recommendations: [
            'Implement water conservation techniques',
            'Consider drought-resistant crop varieties',
            'Install drip irrigation system',
            'Mulch soil to retain moisture'
          ]
        });
        riskScore += weatherData.rainfall < 100 ? 0.9 : 0.7;
      }

      // Flood Risk Assessment
      if (weatherData.rainfall > 800) {
        calamities.push({
          type: 'FLOOD',
          severity: weatherData.rainfall > 1200 ? 'HIGH' : 'MEDIUM',
          probability: weatherData.rainfall > 1200 ? 0.8 : 0.6,
          description: 'Excessive rainfall detected - flood risk high',
          recommendations: [
            'Improve drainage systems',
            'Elevate crop beds',
            'Plant flood-resistant varieties',
            'Create water diversion channels'
          ]
        });
        riskScore += weatherData.rainfall > 1200 ? 0.8 : 0.6;
      }

      // Heat Stress Risk
      if (weatherData.temperature > 35) {
        calamities.push({
          type: 'HEAT_STRESS',
          severity: weatherData.temperature > 40 ? 'HIGH' : 'MEDIUM',
          probability: weatherData.temperature > 40 ? 0.85 : 0.65,
          description: 'High temperature detected - heat stress risk',
          recommendations: [
            'Increase irrigation frequency',
            'Provide shade for crops',
            'Use heat-resistant varieties',
            'Apply organic mulch'
          ]
        });
        riskScore += weatherData.temperature > 40 ? 0.85 : 0.65;
      }

      // Pest Outbreak Risk
      if (weatherData.humidity > 80 && weatherData.temperature > 25) {
        calamities.push({
          type: 'PEST_OUTBREAK',
          severity: weatherData.humidity > 90 ? 'HIGH' : 'MEDIUM',
          probability: weatherData.humidity > 90 ? 0.75 : 0.55,
          description: 'High humidity and temperature - pest outbreak risk',
          recommendations: [
            'Monitor crops regularly',
            'Apply preventive pesticides',
            'Improve air circulation',
            'Remove infected plant parts'
          ]
        });
        riskScore += weatherData.humidity > 90 ? 0.75 : 0.55;
      }

      // Soil Erosion Risk
      if (weatherData.rainfall > 600 && soilData.ph < 6) {
        calamities.push({
          type: 'SOIL_EROSION',
          severity: 'MEDIUM',
          probability: 0.6,
          description: 'High rainfall with acidic soil - erosion risk',
          recommendations: [
            'Plant cover crops',
            'Use contour farming',
            'Apply organic matter',
            'Build terraces on slopes'
          ]
        });
        riskScore += 0.6;
      }

      // Determine overall risk level
      if (riskScore >= 2.0) {
        overallRisk = 'HIGH';
      } else if (riskScore >= 1.0) {
        overallRisk = 'MEDIUM';
      }

      return {
        overall_risk: overallRisk,
        risk_score: Math.round(riskScore * 100) / 100,
        calamities: calamities,
        weather_conditions: {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          rainfall: weatherData.rainfall
        },
        preventive_measures: this.getGeneralPreventiveMeasures(overallRisk)
      };
    } catch (error) {
      throw new Error(`Calamity prediction failed: ${error.message}`);
    }
  }

  getGeneralPreventiveMeasures(riskLevel: string) {
    const measures = {
      LOW: [
        'Continue regular monitoring',
        'Maintain good agricultural practices',
        'Keep emergency supplies ready'
      ],
      MEDIUM: [
        'Increase monitoring frequency',
        'Prepare contingency plans',
        'Stock up on protective materials',
        'Stay updated with weather forecasts'
      ],
      HIGH: [
        'Implement immediate protective measures',
        'Consider crop insurance',
        'Prepare for emergency harvesting',
        'Contact agricultural extension services',
        'Evacuate if necessary'
      ]
    };
    return measures[riskLevel] || measures.LOW;
  }
}

const mlService = new MLService();

async function geocodePlace(district: string, state?: string) {
  try {
    const query = encodeURIComponent(`${district}, ${state || ''}, India`);
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`);
    const data = await response.json();
    const place = data.results?.[0];

    if (place) {
      return {
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        district: place.name,
        state: place.admin1,
        country: place.country
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }

  // Default fallback coordinates for India
  return {
    latitude: 20.5937,
    longitude: 78.9629,
    name: district || 'Location',
    district: district || 'District',
    state: state || '',
    country: 'India'
  };
}

async function reverseGeocode(lat: number, lon: number) {
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`);
    const data = await response.json();
    const place = data.results?.[0];

    if (place) {
      return {
        name: place.name,
        district: place.name,
        state: place.admin1,
        country: place.country
      };
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
  }

  return {
    name: 'Current Location',
    district: 'Local District',
    state: '',
    country: 'India'
  };
}

// Weather API integration with Open-Meteo & default fallbacks
async function getWeatherData(lat: number, lon: number, locationInfo?: any) {
  const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;

  // 1. Try OpenWeather API if API Key is available
  if (apiKey) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.main) {
          return {
            temperature: Math.round(data.main.temp * 10) / 10,
            humidity: Math.round(data.main.humidity),
            rainfall: data.rain?.['1h'] || data.rain?.['3h'] || 0,
            source: 'OpenWeather',
            location: locationInfo || {
              name: data.name,
              district: data.name
            },
            lastUpdated: new Date().toISOString()
          };
        }
      }
    } catch (error: any) {
      console.warn('OpenWeather fetch failed, switching to Open-Meteo fallback:', error.message);
    }
  }

  // 2. Try Open-Meteo (Free API, No Key Required)
  try {
    const omRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain`
    );
    if (omRes.ok) {
      const omData = await omRes.json();
      if (omData?.current) {
        return {
          temperature: Math.round(omData.current.temperature_2m * 10) / 10,
          humidity: Math.round(omData.current.relative_humidity_2m),
          rainfall: omData.current.rain || 0,
          source: 'Open-Meteo',
          location: locationInfo || {
            name: 'Local Area',
            district: 'Local District'
          },
          lastUpdated: new Date().toISOString()
        };
      }
    }
  } catch (error: any) {
    console.warn('Open-Meteo fetch failed, using realistic fallback:', error.message);
  }

  // 3. Guaranteed seasonal fallback values so API never hangs
  return {
    temperature: 28.5,
    humidity: 65,
    rainfall: 15.0,
    source: 'Regional Averages',
    location: locationInfo || {
      name: 'District Area',
      district: 'District Area'
    },
    lastUpdated: new Date().toISOString()
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  app.post('/api/voice-query', handleVoiceQuery);
  app.get('/api/conversations', handleGetConversations);
  app.delete('/api/conversations', handleClearConversations);

  app.delete('/api/history/:type/:id', async (req, res) => {
    try {
      const { type, id } = req.params;
      const farmerId = req.query.farmerId as string;
      if (!farmerId) return res.status(400).json({ success: false, error: 'farmerId is required' });
      await storage.deleteHistoryItem(farmerId, type, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Lookup farmer by phone number
  app.get('/api/farmers/phone/:phone', async (req, res) => {
    try {
      const cleanPhone = req.params.phone.replace(/\D/g, '');
      const farmer = await storage.getFarmerByPhone(cleanPhone);
      if (farmer) {
        res.json({ exists: true, farmer });
      } else {
        res.json({ exists: false });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Farmer authentication routes
  app.post('/api/farmers/login', async (req, res) => {
    try {
      const { phone, email, name, state, district, language } = req.body;
      
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      if (!cleanPhone || cleanPhone.length < 10) {
        return res.status(400).json({ success: false, error: 'Valid 10-digit phone number is required' });
      }

      const normalizedState = state ? state.toLowerCase() : state;
      const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
      
      let farmer = await storage.getFarmerByPhone(cleanPhone);
      
      if (!farmer) {
        // Create new farmer profile
        const farmerData = insertFarmerSchema.parse({
          name: name || 'Farmer',
          phone: cleanPhone,
          email: cleanEmail,
          state: normalizedState,
          district: district,
          language: language || 'en'
        });
        farmer = await storage.createFarmer(farmerData);
      } else {
        // Update existing farmer profile (keep original state fixed for account consistency, allow updating district, name, email, language)
        farmer = await storage.updateFarmer(farmer.id, {
          name: name || farmer.name,
          email: cleanEmail !== null ? cleanEmail : farmer.email,
          district: district || farmer.district,
          language: language || farmer.language
        });
      }
      
      res.json({ success: true, farmer });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Get farmer profile
  app.get('/api/farmers/:id', async (req, res) => {
    try {
      const farmer = await storage.getFarmer(req.params.id);
      if (!farmer) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }
      res.json({ success: true, farmer });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get soil data by district
  app.get('/api/soil/:district', async (req, res) => {
    try {
      const soilData = await storage.getSoilDataByDistrict(req.params.district);
      if (!soilData) {
        // Return default soil data
        const defaultSoilData = {
          N: 90,
          P: 42,
          K: 43,
          ph: 6.5,
          temperature: 25,
          humidity: 70,
          rainfall: 400
        };
        return res.json({ success: true, soilData: defaultSoilData });
      }
      res.json({ success: true, soilData });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get weather data
  app.get('/api/weather', async (req, res) => {
    try {
      const { lat, lon, district, state, farmerId } = req.query;
      let latitude = parseFloat(lat as string);
      let longitude = parseFloat(lon as string);
      let locationInfo: any = null;

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        locationInfo = await reverseGeocode(latitude, longitude);
      } else if (district) {
        locationInfo = await geocodePlace(district as string, state as string);
        if (locationInfo) {
          latitude = locationInfo.latitude;
          longitude = locationInfo.longitude;
        }
      }

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ success: false, error: 'Location not found' });
      }

      const weatherData = await getWeatherData(latitude, longitude, locationInfo);

      if (farmerId) {
        await storage.createWeatherLookup({
          farmerId: farmerId as string,
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          rainfall: weatherData.rainfall,
          locationName: weatherData.location?.name || 'Unknown'
        });
      }

      res.json({ success: true, weatherData });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Crop prediction endpoint
  app.post('/api/predict/crop', async (req, res) => {
    try {
      const { farmerId, soilData } = req.body;
      
      // Validate farmer exists
      const farmer = await storage.getFarmer(farmerId);
      if (!farmer) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }

      // Call ML service for crop prediction
      const mlResult = mlService.predictCrop(soilData);
        
      if (mlResult.error) {
        throw new Error(mlResult.error);
      }

      // Save prediction to storage
      const predictionData = insertCropPredictionSchema.parse({
        farmerId,
        crop: mlResult.predicted_crop,
        confidence: mlResult.confidence,
        soilData,
        alternatives: mlResult.alternatives || [],
        advisory: mlResult.advisory || []
      });

      const prediction = await storage.createCropPrediction(predictionData);
      
      res.json({
        success: true,
        prediction: {
          ...mlResult,
          id: prediction.id,
          createdAt: prediction.createdAt
        }
      });
    } catch (error: any) {
      console.error('Crop prediction error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Yield prediction endpoint
  app.post('/api/predict/yield', async (req, res) => {
    try {
      const { farmerId, yieldData } = req.body;
      
      // Validate farmer exists
      const farmer = await storage.getFarmer(farmerId);
      if (!farmer) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }

      // Call ML service for yield prediction
      const mlResult = mlService.predictYield({ ...yieldData, district: farmer.district });
        
        if (mlResult.error) {
          throw new Error(mlResult.error);
        }

        // Save prediction to storage
        const predictionData = insertYieldPredictionSchema.parse({
          farmerId,
          crop: yieldData.crop,
          season: yieldData.season,
          area: yieldData.area,
          year: yieldData.year,
          predictedProduction: mlResult.predicted_production,
          predictedYield: mlResult.predicted_yield
        });

        const prediction = await storage.createYieldPrediction(predictionData);
        
      res.json({
        success: true,
        prediction: {
          ...mlResult,
          id: prediction.id,
          createdAt: prediction.createdAt
        }
      });
    } catch (error: any) {
      console.error('Yield prediction error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // NEW: Calamity prediction endpoint
  app.post('/api/predict/calamity', async (req, res) => {
    try {
      const { farmerId, weatherData, soilData, crop } = req.body;
      
      // Validate farmer exists
      const farmer = await storage.getFarmer(farmerId);
      if (!farmer) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }

      // Call ML service for calamity prediction
      const mlResult = mlService.predictCalamity(weatherData, soilData, crop);
        
      if (mlResult.error) {
        throw new Error(mlResult.error);
      }

      // Save prediction to storage
      const predictionData = insertCalamityPredictionSchema.parse({
        farmerId,
        crop,
        overallRisk: mlResult.overall_risk,
        riskScore: mlResult.risk_score,
        calamities: mlResult.calamities,
        weatherConditions: mlResult.weather_conditions
      });

      const prediction = await storage.createCalamityPrediction(predictionData);

      res.json({
        success: true,
        prediction: {
          ...mlResult,
          farmerId,
          crop,
          id: prediction.id,
          createdAt: prediction.createdAt
        }
      });
    } catch (error: any) {
      console.error('Calamity prediction error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Extract and validate Soil Health Card using AI Vision
  app.post('/api/soil-health/extract', async (req, res) => {
    try {
      const { image, mimeType, fileName } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: 'No document image provided.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      // Strip data URL prefix if sent as data:image/...;base64,...
      const base64Data = image.replace(/^data:.*?;base64,/, '');

      const prompt = `Analyze this document/image. Your task is to verify if it is an official or valid Soil Health Card (SHC) or Soil Test Report / Laboratory Nutrient Analysis for agriculture.

CRITICAL INSTRUCTIONS:
1. Examine the image content carefully. Look for headings like "Soil Health Card", "Mridaparikshana", "Soil Test", "Soil Analysis", "Nutrient Status", or tables containing Nitrogen (N), Phosphorus (P), Potassium (K), and pH levels.
2. If this document is NOT a Soil Health Card (e.g. random photo, invoice, selfie, person, vehicle, landscape, receipt, certificate, ID card, or unrelated text/document), you MUST set "isValid": false.
3. If it IS a valid Soil Health Card/Report, set "isValid": true and extract the Nitrogen (N in kg/ha or ppm), Phosphorus (P in kg/ha or ppm), Potassium (K in kg/ha or ppm), and pH level values as numbers.

Respond strictly with valid JSON only (no markdown, no code blocks):
If valid:
{"isValid": true, "N": 45.2, "P": 22.0, "K": 58.5, "ph": 6.5}

If invalid:
{"isValid": false, "reason": "The uploaded document is not a valid Soil Health Card or Soil Testing Report. Please upload a clear photo or PDF of a valid Soil Health Card containing N, P, K, and pH values."}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Data
            }
          },
          { text: prompt }
        ]
      });

      const responseText = response.text?.trim() || "";
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      let parsedResult: any = null;
      try {
        parsedResult = JSON.parse(cleanJsonStr);
      } catch (e) {
        console.error("Failed to parse Gemini vision response:", responseText);
      }

      if (parsedResult && parsedResult.isValid === true) {
        return res.json({
          success: true,
          data: {
            N: parsedResult.N ? parsedResult.N.toString() : '45.0',
            P: parsedResult.P ? parsedResult.P.toString() : '25.0',
            K: parsedResult.K ? parsedResult.K.toString() : '55.0',
            ph: parsedResult.ph ? parsedResult.ph.toString() : '6.5'
          }
        });
      } else {
        const errorReason = parsedResult?.reason || "Invalid document. The uploaded file is not a valid Soil Health Card or Soil Test Report. Please upload a valid document containing N, P, K, and pH values.";
        return res.status(400).json({
          success: false,
          error: errorReason
        });
      }
    } catch (error: any) {
      console.error('Soil Health Extraction Error:', error);
      return res.status(400).json({
        success: false,
        error: "Failed to process document. Please ensure you upload a clear image of a valid Soil Health Card."
      });
    }
  });

  // Save soil health report
  app.post('/api/soil-health/report', async (req, res) => {
    try {
      const { farmerId, n, p, k, ph, status, recommendations } = req.body;
      
      const farmer = await storage.getFarmer(farmerId);
      if (!farmer) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }

      const reportData = insertSoilHealthReportSchema.parse({
        farmerId,
        n, p, k, ph,
        status,
        recommendations
      });

      const report = await storage.createSoilHealthReport(reportData);
      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get farmer's unified activity history
  app.get('/api/farmers/:farmerId/history', async (req, res) => {
    try {
      const { farmerId } = req.params;
      
      const [
        cropPredictions,
        yieldPredictions,
        calamityPredictions,
        voiceConversations,
        weatherLookups,
        soilHealthReports
      ] = await Promise.all([
        storage.getCropPredictions(farmerId),
        storage.getYieldPredictions(farmerId),
        storage.getCalamityPredictions(farmerId),
        storage.getVoiceConversations(farmerId),
        storage.getWeatherLookups(farmerId),
        storage.getSoilHealthReports(farmerId)
      ]);

      res.json({
        success: true,
        history: {
          crops: cropPredictions,
          yields: yieldPredictions,
          calamities: calamityPredictions,
          voice: voiceConversations,
          weather: weatherLookups,
          soil: soilHealthReports
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
