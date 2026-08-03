import 'dotenv/config';
import { db } from './db.ts';
import { farmers, cropPredictions, yieldPredictions, calamityPredictions, voiceConversations, soilHealthReports, weatherLookups, loginHistory } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function cleanup() {
  const targetPhone = '8218563995';
  const [farmer] = await db.select().from(farmers).where(eq(farmers.phone, targetPhone));
  
  if (farmer) {
    console.log("Found farmer to delete:", farmer);
    await db.delete(cropPredictions).where(eq(cropPredictions.farmerId, farmer.id));
    await db.delete(yieldPredictions).where(eq(yieldPredictions.farmerId, farmer.id));
    await db.delete(calamityPredictions).where(eq(calamityPredictions.farmerId, farmer.id));
    await db.delete(voiceConversations).where(eq(voiceConversations.farmerId, farmer.id));
    await db.delete(soilHealthReports).where(eq(soilHealthReports.farmerId, farmer.id));
    await db.delete(weatherLookups).where(eq(weatherLookups.farmerId, farmer.id));
    await db.delete(loginHistory).where(eq(loginHistory.userId, farmer.id));
    
    await db.delete(farmers).where(eq(farmers.id, farmer.id));
    console.log("Successfully deleted farmer profile and all data for phone:", targetPhone);
  } else {
    console.log("No farmer found for phone:", targetPhone);
  }
  process.exit(0);
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
