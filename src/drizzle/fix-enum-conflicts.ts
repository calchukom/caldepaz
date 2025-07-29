import { db } from './db';
import { sql } from 'drizzle-orm';

export async function fixEnumConflicts() {
    console.log('🔧 Fixing enum conflicts...');

    try {
        // Check if enums exist and drop if necessary
        const enumsToCheck = [
            'ticket_category',
            'ticket_status',
            'ticket_priority',
            'vehicle_status',
            'booking_status',
            'payment_status',
            'payment_method',
            'user_role',
            'transmission',
            'fuel_type',
            'vehicle_category',
            'maintenance_type'
        ];

        for (const enumName of enumsToCheck) {
            try {
                await db.execute(sql`DROP TYPE IF EXISTS ${sql.identifier(enumName)} CASCADE`);
                console.log(`✅ Dropped enum: ${enumName}`);
            } catch (error) {
                console.log(`⚠️  Enum ${enumName} doesn't exist or couldn't be dropped`);
            }
        }

        // Recreate all enums
        await db.execute(sql`
      CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'rented', 'maintenance', 'out_of_service', 'reserved', 'damaged');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."payment_method" AS ENUM('stripe', 'mpesa', 'cash', 'bank_transfer');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'support_agent');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."ticket_category" AS ENUM('booking', 'payment', 'vehicle', 'technical', 'general');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."transmission" AS ENUM('manual', 'automatic', 'cvt');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."fuel_type" AS ENUM('petrol', 'diesel', 'electric', 'hybrid');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."vehicle_category" AS ENUM('four_wheeler', 'two_wheeler');
    `);

        await db.execute(sql`
      CREATE TYPE "public"."maintenance_type" AS ENUM('routine', 'repair', 'inspection', 'cleaning', 'emergency');
    `);

        console.log('✅ All enums recreated successfully');

    } catch (error) {
        console.error('❌ Error fixing enum conflicts:', error);
        throw error;
    }
}

// Run the fix
fixEnumConflicts()
    .then(() => {
        console.log('🎉 Enum conflicts fixed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Failed to fix enum conflicts:', error);
        process.exit(1);
    });
