import { db } from './db';
import * as schema from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');

async function readJsonFile(filename: string) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required to run migration.');
    process.exit(1);
  }

  console.log('Starting migration to Supabase...');

  try {
    // 1. Migrate Farmers
    const farmersData = await readJsonFile('farmers.json');
    if (farmersData && farmersData.length > 0) {
      console.log(`Migrating ${farmersData.length} farmers...`);
      for (const farmer of farmersData) {
        // Check if exists
        const existing = await db.select().from(schema.farmers).where(eq(schema.farmers.id, farmer.id));
        if (existing.length === 0) {
          await db.insert(schema.farmers).values({
            id: farmer.id,
            name: farmer.name,
            phone: farmer.phone,
            email: farmer.email,
            state: farmer.state,
            district: farmer.district,
            language: farmer.language || 'en',
            createdAt: new Date(farmer.createdAt),
            updatedAt: new Date(farmer.updatedAt),
          });
        }
      }
    }

    // 2. Migrate Predictions
    const predictionsData = await readJsonFile('predictions.json');
    if (predictionsData) {
      if (predictionsData.cropPredictions) {
        console.log(`Migrating ${predictionsData.cropPredictions.length} crop predictions...`);
        for (const p of predictionsData.cropPredictions) {
          const existing = await db.select().from(schema.cropPredictions).where(eq(schema.cropPredictions.id, p.id));
          if (existing.length === 0) {
            await db.insert(schema.cropPredictions).values({
              id: p.id,
              farmerId: p.farmerId,
              crop: p.crop,
              confidence: p.confidence,
              soilData: p.soilData,
              alternatives: p.alternatives || [],
              advisory: p.advisory || [],
              createdAt: new Date(p.createdAt),
            });
          }
        }
      }

      if (predictionsData.yieldPredictions) {
        console.log(`Migrating ${predictionsData.yieldPredictions.length} yield predictions...`);
        for (const p of predictionsData.yieldPredictions) {
          const existing = await db.select().from(schema.yieldPredictions).where(eq(schema.yieldPredictions.id, p.id));
          if (existing.length === 0) {
            await db.insert(schema.yieldPredictions).values({
              id: p.id,
              farmerId: p.farmerId,
              crop: p.crop,
              season: p.season,
              area: p.area,
              year: p.year,
              predictedProduction: p.predictedProduction,
              predictedYield: p.predictedYield,
              createdAt: new Date(p.createdAt),
            });
          }
        }
      }
    }

    // 3. Migrate Voice Conversations
    const voiceData = await readJsonFile('voice_conversations.json');
    if (voiceData && voiceData.length > 0) {
      console.log(`Migrating ${voiceData.length} voice conversations...`);
      for (const v of voiceData) {
        const existing = await db.select().from(schema.voiceConversations).where(eq(schema.voiceConversations.id, v.id));
        if (existing.length === 0) {
          await db.insert(schema.voiceConversations).values({
            id: v.id,
            farmerId: v.farmerId,
            query: v.query,
            response: v.response,
            language: v.language,
            createdAt: new Date(v.createdAt),
          });
        }
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
