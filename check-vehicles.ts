import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { vehicles } from './src/drizzle/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function checkVehicles() {
    try {
        const existingVehicles = await db.select({ license_plate: vehicles.license_plate }).from(vehicles);
        console.log('Existing license plates:');
        existingVehicles.forEach(v => console.log(v.license_plate));
        console.log(`Total vehicles: ${existingVehicles.length}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkVehicles();
