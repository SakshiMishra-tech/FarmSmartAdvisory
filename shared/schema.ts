import { z } from "zod";

// Farmer schema
export const farmerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional(),
  state: z.string().min(1, "State is required"),
  district: z.string().min(1, "District is required"),
  language: z.string().default("en"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertFarmerSchema = farmerSchema.omit({ id: true, createdAt: true, updatedAt: true });

// State and District data
export const stateDistrictData = {
  "maharashtra": ["mumbai", "pune", "nagpur", "nashik", "aurangabad", "solapur", "thane", "kolhapur", "sangli", "satara"],
  "punjab": ["ludhiana", "amritsar", "jalandhar", "patiala", "bathinda", "mohali", "hoshiarpur", "kapurthala", "faridkot", "firozpur"],
  "haryana": ["gurgaon", "faridabad", "panipat", "ambala", "yamunanagar", "rohtak", "hisar", "karnal", "sonipat", "bhiwani"],
  "rajasthan": ["jaipur", "jodhpur", "udaipur", "kota", "bikaner", "ajmer", "bhilwara", "alwar", "bharatpur", "pali"],
  "gujarat": ["ahmedabad", "surat", "vadodara", "rajkot", "bhavnagar", "jamnagar", "gandhinagar", "anand", "navsari", "morbi"],
  "uttar pradesh": ["lucknow", "kanpur", "ghaziabad", "agra", "varanasi", "meerut", "allahabad", "bareilly", "aligarh", "moradabad"],
  "bihar": ["patna", "gaya", "bhagalpur", "muzaffarpur", "purnia", "darbhanga", "bihar sharif", "arrah", "begusarai", "katihar"],
  "west bengal": ["kolkata", "howrah", "durgapur", "asansol", "siliguri", "malda", "barrackpore", "habra", "kharagpur", "haldia"],
  "odisha": ["bhubaneswar", "cuttack", "rourkela", "brahmapur", "sambalpur", "puri", "balasore", "bhadrak", "baripada", "jharsuguda"],
  "tamil nadu": ["chennai", "coimbatore", "madurai", "tiruchirappalli", "salem", "tirunelveli", "tiruppur", "vellore", "erode", "thoothukudi"],
  "karnataka": ["bangalore", "mysore", "hubli", "mangalore", "belgaum", "gulbarga", "davanagere", "bellary", "bijapur", "shimoga"],
  "andhra pradesh": ["hyderabad", "visakhapatnam", "vijayawada", "guntur", "nellore", "kurnool", "rajahmundry", "tirupati", "kakinada", "anantapur"],
  "telangana": ["hyderabad", "warangal", "nizamabad", "khammam", "karimnagar", "ramagundam", "mahabubnagar", "nalgonda", "adilabad", "suryapet"]
};

export type Farmer = z.infer<typeof farmerSchema>;
export type InsertFarmer = z.infer<typeof insertFarmerSchema>;

export const getDistrictsByState = (state: string): string[] => {
  return stateDistrictData[state.toLowerCase() as keyof typeof stateDistrictData] || [];
};

export const getStates = (): string[] => {
  return Object.keys(stateDistrictData).map(state => 
    state.charAt(0).toUpperCase() + state.slice(1)
  );
};

// Soil data schema
export const soilDataSchema = z.object({
  id: z.string(),
  district: z.string(),
  N: z.number().min(0).max(140),
  P: z.number().min(5).max(145),
  K: z.number().min(5).max(205),
  ph: z.number().min(3.5).max(9.9),
  temperature: z.number().min(8.8).max(43.7),
  humidity: z.number().min(14.3).max(99.9),
  rainfall: z.number().min(20.2).max(3000)
});

export type SoilData = z.infer<typeof soilDataSchema>;

// Crop prediction schema
export const cropPredictionSchema = z.object({
  id: z.string(),
  farmerId: z.string(),
  crop: z.string(),
  confidence: z.number(),
  soilData: soilDataSchema.omit({ id: true, district: true }),
  alternatives: z.array(z.object({
    crop: z.string(),
    confidence: z.number()
  })),
  advisory: z.array(z.object({
    type: z.enum(["irrigation", "fertilizer", "pest"]),
    title: z.string(),
    description: z.string()
  })),
  createdAt: z.date().default(() => new Date())
});

export const insertCropPredictionSchema = cropPredictionSchema.omit({ id: true, createdAt: true });

export type CropPrediction = z.infer<typeof cropPredictionSchema>;
export type InsertCropPrediction = z.infer<typeof insertCropPredictionSchema>;

// Yield prediction schema
export const yieldPredictionSchema = z.object({
  id: z.string(),
  farmerId: z.string(),
  crop: z.string(),
  season: z.enum(["Kharif", "Rabi", "Summer"]),
  area: z.number().positive(),
  year: z.number(),
  predictedProduction: z.number(),
  predictedYield: z.number(),
  createdAt: z.date().default(() => new Date())
});

export const insertYieldPredictionSchema = yieldPredictionSchema.omit({ id: true, createdAt: true });

export type YieldPrediction = z.infer<typeof yieldPredictionSchema>;
export type InsertYieldPrediction = z.infer<typeof insertYieldPredictionSchema>;

// Weather data schema
export const weatherDataSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  rainfall: z.number(),
  location: z.string(),
  lastUpdated: z.date()
});

export type WeatherData = z.infer<typeof weatherDataSchema>;

// Language options
export const languages = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "od", name: "Odia", native: "ଓଡ଼ିଆ" }
];

// Supported crops (from ML model)
export const supportedCrops = [
  "rice", "maize", "chickpea", "kidneybeans", "pigeonpeas", "mothbeans",
  "mungbean", "blackgram", "lentil", "pomegranate", "banana", "mango",
  "grapes", "watermelon", "muskmelon", "apple", "orange", "papaya",
  "coconut", "cotton", "jute", "coffee"
];
