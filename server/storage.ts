import { type Farmer, type InsertFarmer, type CropPrediction, type InsertCropPrediction, type YieldPrediction, type InsertYieldPrediction, type SoilData } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private farmers: Map<string, Farmer> = new Map();
  private cropPredictions: Map<string, CropPrediction[]> = new Map();
  private yieldPredictions: Map<string, YieldPrediction[]> = new Map();
  private soilData: Map<string, SoilData> = new Map();

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
}

export const storage = new MemStorage();
