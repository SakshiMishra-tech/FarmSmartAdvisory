import 'dotenv/config';
import { db } from './db.ts';
import { farmers } from '../shared/schema.ts';

async function check() {
  const allFarmers = await db.select().from(farmers);
  console.log("All farmers in database:", JSON.stringify(allFarmers, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
