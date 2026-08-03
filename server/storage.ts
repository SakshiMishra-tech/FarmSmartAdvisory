import { type Farmer, type InsertFarmer, type CropPrediction, type InsertCropPrediction, type YieldPrediction, type InsertYieldPrediction, type SoilData, type VoiceConversation, type InsertVoiceConversation, type CalamityPrediction, type InsertCalamityPrediction, type SoilHealthReport, type InsertSoilHealthReport, type WeatherLookup, type InsertWeatherLookup } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface IStorage {
  // Farmer operations
  getFarmer(id: string): Promise<Farmer | undefined>;
  getFarmerByPhone(phone: string): Promise<Farmer | undefined>;
  getFarmerByEmail(email: string): Promise<Farmer | undefined>;
  createFarmer(farmer: InsertFarmer & { id?: string }): Promise<Farmer>;
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

export class DatabaseStorage implements IStorage {
  async getFarmer(id: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(schema.farmers).where(eq(schema.farmers.id, id));
    return (farmer as unknown) as Farmer | undefined;
  }

  async getFarmerByPhone(phone: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(schema.farmers).where(eq(schema.farmers.phone, phone));
    return (farmer as unknown) as Farmer | undefined;
  }

  async getFarmerByEmail(email: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(schema.farmers).where(eq(schema.farmers.email, email));
    return (farmer as unknown) as Farmer | undefined;
  }

  async createFarmer(insertFarmer: InsertFarmer & { id?: string }): Promise<Farmer> {
    const id = insertFarmer.id || randomUUID();
    const [farmer] = await db.insert(schema.farmers).values({ ...insertFarmer, id }).returning();
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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is strictly required for this application to run. Fallback storage has been removed as per strict architectural guidelines.");
}

export const storage = new DatabaseStorage();
