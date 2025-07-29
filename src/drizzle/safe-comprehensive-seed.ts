import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import {
    locations,
    users,
    vehicleSpecifications,
    vehicles,
    bookings,
    payments,
    supportTickets,
    maintenanceRecords
} from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export async function comprehensiveSeedSafe() {
    try {
        console.log('🌱 Starting safe comprehensive seeding...');

        // Check what already exists
        const existingLocations = await db.select().from(locations);
        const existingUsers = await db.select().from(users);
        const existingVehicles = await db.select().from(vehicles);
        const existingSpecs = await db.select().from(vehicleSpecifications);

        console.log(`Found ${existingLocations.length} locations, ${existingUsers.length} users, ${existingSpecs.length} specs, ${existingVehicles.length} vehicles`);

        // Only add new international locations if we don't have enough
        if (existingLocations.length < 10) {
            console.log('📍 Adding international locations...');
            const internationalLocations = [
                {
                    name: "Kampala Downtown Branch",
                    address: "Plot 42, Kampala Road, Central Division, Kampala, Uganda",
                    contact_phone: "+256701234567"
                },
                {
                    name: "Kigali Business District",
                    address: "KN 3 Ave, Nyarugenge, Kigali City, Rwanda",
                    contact_phone: "+250788123456"
                },
                {
                    name: "Dar es Salaam Central Hub",
                    address: "Samora Avenue, Ilala District, Dar es Salaam, Tanzania",
                    contact_phone: "+255754123456"
                },
                {
                    name: "Addis Ababa Premium Station",
                    address: "Bole Road, Addis Ketema, Addis Ababa, Ethiopia",
                    contact_phone: "+251911123456"
                },
                {
                    name: "Lagos Victoria Island",
                    address: "Tiamiyu Savage Street, Victoria Island, Lagos, Nigeria",
                    contact_phone: "+234803123456"
                }
            ];

            for (const loc of internationalLocations) {
                await db.insert(locations).values(loc).onConflictDoUpdate({
                    target: locations.name,
                    set: { address: loc.address, contact_phone: loc.contact_phone }
                }).catch(() => {
                    // If there's no unique constraint on name, just insert
                    return db.insert(locations).values(loc);
                });
            }
            console.log('✅ International locations added');
        }

        // Add diverse users if needed
        if (existingUsers.length < 15) {
            console.log('👥 Adding international users...');
            const hashedPassword = await bcrypt.hash("SecurePass123!", 12);

            const internationalUsers = [
                {
                    email: "alexandra.global@rentalmax.com",
                    password: hashedPassword,
                    firstname: "Alexandra",
                    lastname: "Rodriguez",
                    contact_phone: "+1-555-0199",
                    role: 'admin' as const
                },
                {
                    email: "kwame.manager@rentalmax.com",
                    password: hashedPassword,
                    firstname: "Kwame",
                    lastname: "Asante",
                    contact_phone: "+233244888777",
                    role: 'admin' as const
                },
                {
                    email: "fatima.driver@rentalmax.com",
                    password: hashedPassword,
                    firstname: "Fatima",
                    lastname: "Hassan",
                    contact_phone: "+255754876543",
                    role: 'user' as const
                },
                {
                    email: "james.corporate@rentalmax.com",
                    password: hashedPassword,
                    firstname: "James",
                    lastname: "Wellington",
                    contact_phone: "+44207123456",
                    role: 'user' as const
                },
                {
                    email: "amara.support@rentalmax.com",
                    password: hashedPassword,
                    firstname: "Amara",
                    lastname: "Okafor",
                    contact_phone: "+234803456789",
                    role: 'support_agent' as const
                }
            ];

            for (const user of internationalUsers) {
                try {
                    await db.insert(users).values(user);
                } catch (error: any) {
                    if (error.code === '23505') {
                        console.log(`ℹ️ User ${user.email} already exists`);
                    } else {
                        throw error;
                    }
                }
            }
            console.log('✅ International users added');
        }

        // Add premium vehicle specifications if needed
        if (existingSpecs.length < 15) {
            console.log('🚗 Adding premium vehicle specifications...');
            const premiumSpecs = [
                {
                    manufacturer: "Mercedes-Benz",
                    model: "S-Class S500",
                    year: 2024,
                    vehicle_category: "four_wheeler" as const,
                    fuel_type: "petrol" as const,
                    transmission: "automatic" as const,
                    seating_capacity: 5,
                    engine_capacity: "3.0L V6 Turbo",
                    color: "Obsidian Black",
                    features: JSON.stringify([
                        "Premium leather seats", "Massage function", "Air suspension"
                    ])
                },
                {
                    manufacturer: "Tesla",
                    model: "Model X Plaid",
                    year: 2024,
                    vehicle_category: "four_wheeler" as const,
                    fuel_type: "electric" as const,
                    transmission: "automatic" as const,
                    seating_capacity: 7,
                    engine_capacity: "Tri-Motor",
                    color: "Pearl White",
                    features: JSON.stringify([
                        "Falcon wing doors", "17-inch touchscreen", "Autopilot"
                    ])
                },
                {
                    manufacturer: "BMW",
                    model: "X7 M50i",
                    year: 2024,
                    vehicle_category: "four_wheeler" as const,
                    fuel_type: "petrol" as const,
                    transmission: "automatic" as const,
                    seating_capacity: 7,
                    engine_capacity: "4.4L V8 Twin-Turbo",
                    color: "Alpine White",
                    features: JSON.stringify([
                        "M Sport package", "Panoramic sunroof", "Harman Kardon audio"
                    ])
                }
            ];

            for (const spec of premiumSpecs) {
                await db.insert(vehicleSpecifications).values(spec);
            }
            console.log('✅ Premium specifications added');
        }

        // Add vehicles with unique license plates
        if (existingVehicles.length < 30) {
            console.log('🚙 Adding premium vehicle inventory...');
            const newLocations = await db.select().from(locations);
            const newSpecs = await db.select().from(vehicleSpecifications);

            if (newLocations.length > 0 && newSpecs.length > 0) {
                const premiumVehicles = [];
                let plateCounter = 1000; // Start with high numbers to avoid conflicts

                // Create some premium vehicles with unique plates
                for (let i = 0; i < 5; i++) {
                    const randomSpec = newSpecs[Math.floor(Math.random() * newSpecs.length)];
                    const randomLocation = newLocations[Math.floor(Math.random() * newLocations.length)];
                    const statusOptions = ['available', 'rented', 'maintenance'] as const;

                    premiumVehicles.push({
                        vehicleSpec_id: randomSpec.vehicleSpec_id,
                        location_id: randomLocation.location_id,
                        license_plate: `INTL-${plateCounter + i}`,
                        rental_rate: (100 + Math.floor(Math.random() * 200)).toString(),
                        status: statusOptions[Math.floor(Math.random() * 3)],
                        mileage: Math.floor(Math.random() * 50000),
                        fuel_level: Math.floor(Math.random() * 100) + 1,
                        condition_rating: Math.floor(Math.random() * 5) + 6, // 6-10 rating
                        acquisition_cost: (50000 + Math.floor(Math.random() * 100000)).toString(),
                        insurance_expiry: new Date('2025-12-31'),
                        registration_expiry: new Date('2025-12-31'),
                        last_service_date: new Date('2024-06-01'),
                        next_service_due: new Date('2024-09-01')
                    });
                }

                for (const vehicle of premiumVehicles) {
                    try {
                        await db.insert(vehicles).values(vehicle);
                    } catch (error: any) {
                        if (error.code === '23505') {
                            console.log(`ℹ️ Vehicle ${vehicle.license_plate} already exists`);
                        } else {
                            throw error;
                        }
                    }
                }
                console.log('✅ Premium vehicles added');
            }
        }

        console.log('✅ Safe comprehensive seeding completed successfully!');

        // Show final counts
        const finalLocations = await db.select().from(locations);
        const finalUsers = await db.select().from(users);
        const finalSpecs = await db.select().from(vehicleSpecifications);
        const finalVehicles = await db.select().from(vehicles);

        console.log(`\n📊 Final database state:`);
        console.log(`📍 Locations: ${finalLocations.length}`);
        console.log(`👥 Users: ${finalUsers.length}`);
        console.log(`🚗 Vehicle Specifications: ${finalSpecs.length}`);
        console.log(`🚙 Vehicles: ${finalVehicles.length}`);

    } catch (error) {
        console.error('❌ Error during safe comprehensive seeding:', error);
        throw error;
    }
}

// Run the seeding
comprehensiveSeedSafe()
    .then(() => {
        console.log('🎉 Database seeding completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Seeding failed:', error);
        process.exit(1);
    });
