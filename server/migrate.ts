import 'dotenv/config';
import postgres from 'postgres';

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  try {
    // Fix 1: Add missing columns to login_history if they don't exist
    const loginHistoryCols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'login_history'
    `;
    const existingCols = loginHistoryCols.map((r: any) => r.column_name);
    console.log('Existing login_history columns:', existingCols);

    const colsToAdd: Record<string, string> = {
      operating_system: 'TEXT',
      device_type: 'TEXT',
      user_agent: 'TEXT',
      ip_address: 'TEXT',
      country: 'TEXT',
      city: 'TEXT',
      latitude: 'REAL',
      longitude: 'REAL',
      live_location_enabled: 'BOOLEAN DEFAULT FALSE',
      language: 'TEXT',
      timezone: 'TEXT',
      screen_width: 'INTEGER',
      screen_height: 'INTEGER',
      network_type: 'TEXT',
      is_online: 'BOOLEAN DEFAULT TRUE',
    };

    for (const [col, type] of Object.entries(colsToAdd)) {
      if (!existingCols.includes(col)) {
        console.log(`Adding column: ${col}`);
        await sql.unsafe(`ALTER TABLE login_history ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      } else {
        console.log(`Column already exists: ${col}`);
      }
    }

    // Fix 2: Drop the bad FK constraint on weather_lookups if it references wrong table
    const constraints = await sql`
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'weather_lookups' AND constraint_type = 'FOREIGN KEY'
    `;
    console.log('weather_lookups FK constraints:', constraints.map((r: any) => r.constraint_name));
    
    // Check if weather_lookups farmer_id FK is wrong (pointing to non-existent table)
    const wlFKDetail = await sql`
      SELECT
        tc.constraint_name, 
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'weather_lookups'
    `;
    console.log('weather_lookups FK details:', wlFKDetail);

    console.log('\n✅ Migration completed successfully!');
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    await sql.end();
    process.exit(1);
  }
}

migrate();
