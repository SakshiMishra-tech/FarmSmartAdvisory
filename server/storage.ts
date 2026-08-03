import { type Farmer, type InsertFarmer, type CropPrediction, type InsertCropPrediction, type YieldPrediction, type InsertYieldPrediction, type SoilData, type VoiceConversation, type InsertVoiceConversation, type CalamityPrediction, type InsertCalamityPrediction, type SoilHealthReport, type InsertSoilHealthReport, type WeatherLookup, type InsertWeatherLookup } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');

export interface IStorage {
  // Farmer operations
  getFarmer(id: string): Promise<Farmer | undefined>;
  getFarmerByPhone(phone: string): Promise<Farmer | undefined>;
  createFarmer(farmer: InsertFarmer): Promise<Farmer>;
  updateFarmer(id: string, farmer: Partial<InsertFarmer>): Promise<Farmer>;
  
  // Soil data operations
  getSoilDataByDistrict(district: string): Promise<SoilData | undefined>;
  
  // Crop prediction operations
  getCropPredictions(farmerId: string): Promise<CropPrediction[]>;
  createCropPrediction(prediction: InsertCropPrediction): Promise<CropPrediction>;
  
  // Yield prediction operations
  getYieldPredictions(farmerId: string): Promise<YieldPrediction[]>;
  createYieldPrediction(prediction: InsertYieldPrediction): Promise<YieldPrediction>;

  // Voice conversation operations
  getVoiceConversations(farmerId: string): Promise<VoiceConversation[]>;
  createVoiceConversation(conversation: InsertVoiceConversation): Promise<VoiceConversation>;
  clearVoiceConversations(farmerId: string): Promise<void>;

  // Calamity prediction operations
  getCalamityPredictions(farmerId: string): Promise<CalamityPrediction[]>;
  createCalamityPrediction(prediction: InsertCalamityPrediction): Promise<CalamityPrediction>;

  // Soil health operations
  getSoilHealthReports(farmerId: string): Promise<SoilHealthReport[]>;
  createSoilHealthReport(report: InsertSoilHealthReport): Promise<SoilHealthReport>;

  // Weather lookup operations
  getWeatherLookups(farmerId: string): Promise<WeatherLookup[]>;
  createWeatherLookup(lookup: InsertWeatherLookup): Promise<WeatherLookup>;

  // Generic delete operation for history
  deleteHistoryItem(farmerId: string, type: string, id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private farmers: Map<string, Farmer> = new Map();
  private cropPredictions: Map<string, CropPrediction[]> = new Map();
  private yieldPredictions: Map<string, YieldPrediction[]> = new Map();
  private soilData: Map<string, SoilData> = new Map();
  private voiceConversations: Map<string, VoiceConversation[]> = new Map();

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      // Load farmers
      const farmersData = await this.readJsonFile('farmers.json');
      if (farmersData) {
        farmersData.forEach((farmer: Farmer) => {
          this.farmers.set(farmer.id, farmer);
        });
      }

      // Load soil data
      const soilDataArray = await this.readJsonFile('soil_data.json');
      if (soilDataArray) {
        soilDataArray.forEach((soil: SoilData) => {
          this.soilData.set(soil.district.toLowerCase(), soil);
        });
      }

      // Load predictions
      const predictionsData = await this.readJsonFile('predictions.json');
      if (predictionsData) {
        predictionsData.cropPredictions?.forEach((prediction: CropPrediction) => {
          if (!this.cropPredictions.has(prediction.farmerId)) {
            this.cropPredictions.set(prediction.farmerId, []);
          }
          this.cropPredictions.get(prediction.farmerId)!.push(prediction);
        });

        predictionsData.yieldPredictions?.forEach((prediction: YieldPrediction) => {
          if (!this.yieldPredictions.has(prediction.farmerId)) {
            this.yieldPredictions.set(prediction.farmerId, []);
          }
          this.yieldPredictions.get(prediction.farmerId)!.push(prediction);
        });
      }

      // Load voice conversations
      const voiceData = await this.readJsonFile('voice_conversations.json');
      if (voiceData) {
        voiceData.forEach((conv: VoiceConversation) => {
          if (!this.voiceConversations.has(conv.farmerId)) {
            this.voiceConversations.set(conv.farmerId, []);
          }
          this.voiceConversations.get(conv.farmerId)!.push(conv);
        });
      }
    } catch (error) {
      console.log('No existing data files found, starting fresh');
    }
  }

  private async readJsonFile(filename: string) {
    try {
      const filePath = path.join(DATA_DIR, filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  private async saveData() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Save farmers
      const farmersArray = Array.from(this.farmers.values());
      await fs.writeFile(
        path.join(DATA_DIR, 'farmers.json'),
        JSON.stringify(farmersArray, null, 2)
      );

      // Save predictions
      const cropPredictionsArray: CropPrediction[] = [];
      const yieldPredictionsArray: YieldPrediction[] = [];

      this.cropPredictions.forEach(predictions => {
        cropPredictionsArray.push(...predictions);
      });

      this.yieldPredictions.forEach(predictions => {
        yieldPredictionsArray.push(...predictions);
      });

      await fs.writeFile(
        path.join(DATA_DIR, 'predictions.json'),
        JSON.stringify({
          cropPredictions: cropPredictionsArray,
          yieldPredictions: yieldPredictionsArray
        }, null, 2)
      );

      // Save voice conversations
      const voiceArray: VoiceConversation[] = [];
      this.voiceConversations.forEach(convs => voiceArray.push(...convs));
      await fs.writeFile(
        path.join(DATA_DIR, 'voice_conversations.json'),
        JSON.stringify(voiceArray, null, 2)
      );
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async getFarmer(id: string): Promise<Farmer | undefined> {
    return this.farmers.get(id);
  }

  async getFarmerByPhone(phone: string): Promise<Farmer | undefined> {
    return Array.from(this.farmers.values()).find(farmer => farmer.phone === phone);
  }

  async createFarmer(insertFarmer: InsertFarmer): Promise<Farmer> {
    const id = randomUUID();
    const farmer: Farmer = {
      ...insertFarmer,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.farmers.set(id, farmer);
    await this.saveData();
    return farmer;
  }

  async updateFarmer(id: string, updateData: Partial<InsertFarmer>): Promise<Farmer> {
    const farmer = this.farmers.get(id);
    if (!farmer) {
      throw new Error('Farmer not found');
    }

    const updatedFarmer: Farmer = {
      ...farmer,
      ...updateData,
      updatedAt: new Date()
    };

    this.farmers.set(id, updatedFarmer);
    await this.saveData();
    return updatedFarmer;
  }

  async getSoilDataByDistrict(district: string): Promise<SoilData | undefined> {
    return this.soilData.get(district.toLowerCase());
  }

  async getCropPredictions(farmerId: string): Promise<CropPrediction[]> {
    return this.cropPredictions.get(farmerId) || [];
  }

  async createCropPrediction(insertPrediction: InsertCropPrediction): Promise<CropPrediction> {
    const id = randomUUID();
    const prediction: CropPrediction = {
      ...insertPrediction,
      id,
      createdAt: new Date()
    };

    if (!this.cropPredictions.has(prediction.farmerId)) {
      this.cropPredictions.set(prediction.farmerId, []);
    }
    this.cropPredictions.get(prediction.farmerId)!.push(prediction);
    await this.saveData();
    return prediction;
  }

  async getYieldPredictions(farmerId: string): Promise<YieldPrediction[]> {
    return this.yieldPredictions.get(farmerId) || [];
  }

  async createYieldPrediction(insertPrediction: InsertYieldPrediction): Promise<YieldPrediction> {
    const id = randomUUID();
    const prediction: YieldPrediction = {
      ...insertPrediction,
      id,
      createdAt: new Date()
    };

    if (!this.yieldPredictions.has(prediction.farmerId)) {
      this.yieldPredictions.set(prediction.farmerId, []);
    }
    this.yieldPredictions.get(prediction.farmerId)!.push(prediction);
    await this.saveData();
    return prediction;
  }

  async getVoiceConversations(farmerId: string): Promise<VoiceConversation[]> {
    return this.voiceConversations.get(farmerId) || [];
  }

  async createVoiceConversation(insertConv: InsertVoiceConversation): Promise<VoiceConversation> {
    const id = randomUUID();
    const conv: VoiceConversation = {
      ...insertConv,
      id,
      createdAt: new Date()
    };
    if (!this.voiceConversations.has(conv.farmerId)) {
      this.voiceConversations.set(conv.farmerId, []);
    }
    this.voiceConversations.get(conv.farmerId)!.push(conv);
    await this.saveData();
    return conv;
  }

  async clearVoiceConversations(farmerId: string): Promise<void> {
    this.voiceConversations.delete(farmerId);
    await this.saveData();
  }

  async getCalamityPredictions(farmerId: string): Promise<CalamityPrediction[]> {
    return []; // MemStorage isn't used for new tables beyond basic save returning
  }

  async createCalamityPrediction(insertPrediction: InsertCalamityPrediction): Promise<CalamityPrediction> {
    const id = randomUUID();
    return { ...insertPrediction, id, createdAt: new Date() };
  }

  async getSoilHealthReports(farmerId: string): Promise<SoilHealthReport[]> {
    return [];
  }

  async createSoilHealthReport(insertReport: InsertSoilHealthReport): Promise<SoilHealthReport> {
    const id = randomUUID();
    return { ...insertReport, id, createdAt: new Date() };
  }

  async getWeatherLookups(farmerId: string): Promise<WeatherLookup[]> {
    return [];
  }

  async createWeatherLookup(insertLookup: InsertWeatherLookup): Promise<WeatherLookup> {
    const id = randomUUID();
    return { ...insertLookup, id, createdAt: new Date() };
  }

  async deleteHistoryItem(farmerId: string, type: string, id: string): Promise<void> {
    switch (type) {
      case 'crop':
        if (this.cropPredictions.has(farmerId)) {
          this.cropPredictions.set(farmerId, this.cropPredictions.get(farmerId)!.filter(p => p.id !== id));
        }
        break;
      case 'yield':
        if (this.yieldPredictions.has(farmerId)) {
          this.yieldPredictions.set(farmerId, this.yieldPredictions.get(farmerId)!.filter(p => p.id !== id));
        }
        break;
      case 'voice':
        if (this.voiceConversations.has(farmerId)) {
          this.voiceConversations.set(farmerId, this.voiceConversations.get(farmerId)!.filter(p => p.id !== id));
        }
        break;
      // Calamity, Weather, Soil Health not persisted in MemStorage fully, but ignoring for now
    }
    await this.saveData();
  }
}

import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

export class DatabaseStorage implements IStorage {
  async getFarmer(id: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(schema.farmers).where(eq(schema.farmers.id, id));
    return (farmer as unknown) as Farmer | undefined;
  }

  async getFarmerByPhone(phone: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(schema.farmers).where(eq(schema.farmers.phone, phone));
    return (farmer as unknown) as Farmer | undefined;
  }

  async createFarmer(insertFarmer: InsertFarmer): Promise<Farmer> {
    const [farmer] = await db.insert(schema.farmers).values({ ...insertFarmer, id: randomUUID() }).returning();
    return (farmer as unknown) as Farmer;
  }

  async updateFarmer(id: string, updateData: Partial<InsertFarmer>): Promise<Farmer> {
    const [farmer] = await db.update(schema.farmers).set(updateData).where(eq(schema.farmers.id, id)).returning();
    return (farmer as unknown) as Farmer;
  }

  async getSoilDataByDistrict(district: string): Promise<SoilData | undefined> {
    // In database, this is usually fetched from an external API or pre-seeded table
    return undefined; // We'll keep the fallback behavior in routes.ts
  }

  async getCropPredictions(farmerId: string): Promise<CropPrediction[]> {
    const results = await db.select().from(schema.cropPredictions).where(eq(schema.cropPredictions.farmerId, farmerId));
    return (results as unknown) as CropPrediction[];
  }

  async createCropPrediction(insertPrediction: InsertCropPrediction): Promise<CropPrediction> {
    const [prediction] = await db.insert(schema.cropPredictions).values({ ...insertPrediction, id: randomUUID() }).returning();
    return (prediction as unknown) as CropPrediction;
  }

  async getYieldPredictions(farmerId: string): Promise<YieldPrediction[]> {
    const results = await db.select().from(schema.yieldPredictions).where(eq(schema.yieldPredictions.farmerId, farmerId));
    return (results as unknown) as YieldPrediction[];
  }

  async createYieldPrediction(insertPrediction: InsertYieldPrediction): Promise<YieldPrediction> {
    const [prediction] = await db.insert(schema.yieldPredictions).values({ ...insertPrediction, id: randomUUID() }).returning();
    return (prediction as unknown) as YieldPrediction;
  }

  async getVoiceConversations(farmerId: string): Promise<VoiceConversation[]> {
    const results = await db.select().from(schema.voiceConversations).where(eq(schema.voiceConversations.farmerId, farmerId));
    return (results as unknown) as VoiceConversation[];
  }

  async createVoiceConversation(insertConv: InsertVoiceConversation): Promise<VoiceConversation> {
    const [conv] = await db.insert(schema.voiceConversations).values({ ...insertConv, id: randomUUID() }).returning();
    return (conv as unknown) as VoiceConversation;
  }

  async clearVoiceConversations(farmerId: string): Promise<void> {
    await db.delete(schema.voiceConversations).where(eq(schema.voiceConversations.farmerId, farmerId));
  }

  async getCalamityPredictions(farmerId: string): Promise<CalamityPrediction[]> {
    const results = await db.select().from(schema.calamityPredictions).where(eq(schema.calamityPredictions.farmerId, farmerId));
    return (results as unknown) as CalamityPrediction[];
  }

  async createCalamityPrediction(insertPrediction: InsertCalamityPrediction): Promise<CalamityPrediction> {
    const [prediction] = await db.insert(schema.calamityPredictions).values({
      ...insertPrediction,
      id: randomUUID(),
      calamities: insertPrediction.calamities || [],
      weatherConditions: insertPrediction.weatherConditions || {}
    }).returning();
    return (prediction as unknown) as CalamityPrediction;
  }

  async getSoilHealthReports(farmerId: string): Promise<SoilHealthReport[]> {
    const results = await db.select().from(schema.soilHealthReports).where(eq(schema.soilHealthReports.farmerId, farmerId));
    return (results as unknown) as SoilHealthReport[];
  }

  async createSoilHealthReport(insertReport: InsertSoilHealthReport): Promise<SoilHealthReport> {
    const [report] = await db.insert(schema.soilHealthReports).values({
      ...insertReport,
      id: randomUUID(),
      recommendations: insertReport.recommendations || []
    }).returning();
    return (report as unknown) as SoilHealthReport;
  }

  async getWeatherLookups(farmerId: string): Promise<WeatherLookup[]> {
    const results = await db.select().from(schema.weatherLookups).where(eq(schema.weatherLookups.farmerId, farmerId));
    return (results as unknown) as WeatherLookup[];
  }

  async createWeatherLookup(insertLookup: InsertWeatherLookup): Promise<WeatherLookup> {
    const [lookup] = await db.insert(schema.weatherLookups).values({ ...insertLookup, id: randomUUID() }).returning();
    return (lookup as unknown) as WeatherLookup;
  }

  async deleteHistoryItem(farmerId: string, type: string, id: string): Promise<void> {
    switch (type) {
      case 'crop':
        await db.delete(schema.cropPredictions).where(eq(schema.cropPredictions.id, id));
        break;
      case 'yield':
        await db.delete(schema.yieldPredictions).where(eq(schema.yieldPredictions.id, id));
        break;
      case 'voice':
        await db.delete(schema.voiceConversations).where(eq(schema.voiceConversations.id, id));
        break;
      case 'calamity':
        await db.delete(schema.calamityPredictions).where(eq(schema.calamityPredictions.id, id));
        break;
      case 'weather':
        await db.delete(schema.weatherLookups).where(eq(schema.weatherLookups.id, id));
        break;
      case 'soil':
        await db.delete(schema.soilHealthReports).where(eq(schema.soilHealthReports.id, id));
        break;
    }
  }
}

// Ensure DATABASE_URL is set to use true DatabaseStorage, else fallback to MemStorage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
