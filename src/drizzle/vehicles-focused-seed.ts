import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
    users,
    vehicleSpecifications,
    vehicles,
    vehicleImages,
    locations,
} from "./schema";

/**
 * Vehicle-Focused Seeding Script
 * 
 * This script seeds the database with vehicles data without deleting existing data by default.
 * 
 * Usage:
 * - npm run seed:vehicles          (preserves existing data)
 * - npm run seed:vehicles --clear  (clears all data first)
 * - npm run seed:vehicles --force  (clears all data first)
 */

async function vehiclesFocusedSeed() {
    console.log("🚗 Starting vehicles-focused seeding with 20 vehicles per location...");

    try {
        // Only clear existing vehicle-related data if explicitly requested
        const shouldClearData = process.argv.includes('--clear') || process.argv.includes('--force');

        if (shouldClearData) {
            console.log("🧹 Clearing existing vehicle data...");
            await db.delete(vehicleImages);
            await db.delete(vehicles);
            await db.delete(vehicleSpecifications);
            await db.delete(locations);
            await db.delete(users);
            console.log("✅ Existing vehicle data cleared successfully!");
        } else {
            console.log("ℹ️  Preserving existing data. Use --clear flag to clear existing data if needed.");
        }

        // ===== CREATE ADMIN USER FIRST =====
        console.log("👤 Creating admin user...");
        const hashedPassword = await bcrypt.hash("admin123!", 10);

        let adminUser;
        try {
            [adminUser] = await db
                .insert(users)
                .values({
                    firstname: "System",
                    lastname: "Administrator",
                    email: "admin@vehiclerental.com",
                    password: hashedPassword,
                    role: "admin",
                    contact_phone: "+1234567890",
                    address: "123 Admin Street, Management City, MC 12345",
                })
                .returning();

            console.log(`✅ Admin user created: ${adminUser.email}`);
        } catch (error: any) {
            // Handle Neon/PostgreSQL duplicate key error
            if (error.cause?.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('users_email_key')) {
                console.log("ℹ️  Admin user already exists, skipping creation...");
                const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@vehiclerental.com")).limit(1);
                adminUser = existingAdmin[0];
            } else {
                throw error;
            }
        }

        // ===== LOCATIONS (5 major locations) =====
        console.log("📍 Creating vehicle rental locations...");

        const locationData = [
            {
                name: "Downtown Manhattan Branch",
                address: "456 Broadway Avenue, New York, NY 10013, USA",
                contact_phone: "+1-212-555-0001",
            },
            {
                name: "Beverly Hills Premium Location",
                address: "789 Rodeo Drive, Beverly Hills, CA 90210, USA",
                contact_phone: "+1-310-555-0002",
            },
            {
                name: "Miami Beach Luxury Fleet",
                address: "321 Ocean Drive, Miami Beach, FL 33139, USA",
                contact_phone: "+1-305-555-0003",
            },
            {
                name: "Chicago Downtown Hub",
                address: "654 Michigan Avenue, Chicago, IL 60611, USA",
                contact_phone: "+1-312-555-0004",
            },
            {
                name: "Las Vegas Strip Center",
                address: "987 Las Vegas Blvd S, Las Vegas, NV 89101, USA",
                contact_phone: "+1-702-555-0005",
            }
        ];

        let insertedLocations;
        try {
            insertedLocations = await db
                .insert(locations)
                .values(locationData)
                .returning();
            console.log(`✅ Created ${insertedLocations.length} new locations`);
        } catch (error: any) {
            if (error.cause?.code === '23505' || error.message?.includes('duplicate key')) {
                console.log("ℹ️  Some locations already exist, fetching existing locations...");
                insertedLocations = await db.select().from(locations);
                console.log(`✅ Using ${insertedLocations.length} existing locations`);
            } else {
                throw error;
            }
        }

        // ===== VEHICLE SPECIFICATIONS (Diverse fleet) =====
        console.log("🚙 Creating vehicle specifications...");

        const vehicleSpecsData = [
            // Luxury Cars
            {
                manufacturer: "Mercedes-Benz",
                model: "S-Class S580",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "4.0L V8 Turbo",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Obsidian Black Metallic",
                features: "Premium leather, massage seats, ambient lighting, Burmester sound system, adaptive cruise control, lane keep assist, parking sensors, wireless charging",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "BMW",
                model: "7 Series 750i",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "4.4L V8 Twin Turbo",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Alpine White",
                features: "Executive lounge seating, gesture control, crystal gear selector, Harman Kardon audio, adaptive LED headlights, panoramic sunroof",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Audi",
                model: "A8 L Quattro",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "3.0L V6 TFSI",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Phantom Black Pearl",
                features: "Matrix LED headlights, quattro all-wheel drive, Bang & Olufsen 3D sound, massage seats, AI traffic light information",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Lexus",
                model: "LS 500",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "3.5L V6 Twin Turbo",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Atomic Silver",
                features: "Kiriko glass trim, shiatsu massage seats, Mark Levinson audio, safety system 2.0, air suspension",
                vehicle_category: "four_wheeler" as const
            },
            // Sports Cars
            {
                manufacturer: "Porsche",
                model: "911 Carrera S",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "3.0L Twin Turbo",
                transmission: "automatic" as const,
                seating_capacity: 2,
                color: "Guards Red",
                features: "Sport Chrono package, PASM suspension, Bose audio, sport seats, ceramic brakes, launch control",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Ferrari",
                model: "F8 Tributo",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "3.9L V8 Turbo",
                transmission: "automatic" as const,
                seating_capacity: 2,
                color: "Rosso Corsa",
                features: "Side slip control, dynamic enhancer, carbon fiber interior, premium leather, F1 paddle shifters",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Lamborghini",
                model: "Huracán EVO",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "5.2L V10",
                transmission: "automatic" as const,
                seating_capacity: 2,
                color: "Arancio Borealis",
                features: "LDVI system, performance traction control, Alcantara interior, carbon fiber accents, launch control",
                vehicle_category: "four_wheeler" as const
            },
            // SUVs
            {
                manufacturer: "Range Rover",
                model: "Autobiography",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "5.0L V8 Supercharged",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Byron Blue Metallic",
                features: "Air suspension, terrain response, Meridian sound, heated/cooled seats, panoramic roof, wade sensing",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Cadillac",
                model: "Escalade Platinum",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "6.2L V8",
                transmission: "automatic" as const,
                seating_capacity: 8,
                color: "Shadow Metallic",
                features: "Super Cruise, AKG studio audio, curved OLED display, air ride suspension, captain chairs",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Lincoln",
                model: "Navigator Black Label",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "3.5L V6 Twin Turbo",
                transmission: "automatic" as const,
                seating_capacity: 7,
                color: "Infinite Black Metallic",
                features: "Perfect Position seats, Revel audio, adaptive suspension, 360-degree camera, wireless charging pad",
                vehicle_category: "four_wheeler" as const
            },
            // Electric Vehicles
            {
                manufacturer: "Tesla",
                model: "Model S Plaid",
                year: 2024,
                fuel_type: "electric" as const,
                engine_capacity: "Tri-Motor All-Wheel Drive",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Pearl White Multi-Coat",
                features: "Autopilot, 17-inch touchscreen, premium audio, glass roof, over-the-air updates, supercharging",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Lucid",
                model: "Air Dream Edition",
                year: 2024,
                fuel_type: "electric" as const,
                engine_capacity: "Dual Motor AWD",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Stellar White",
                features: "Glass canopy, 34-inch curved display, massage seats, surreal sound pro, DreamDrive assistance",
                vehicle_category: "four_wheeler" as const
            },
            // Premium Sedans
            {
                manufacturer: "Genesis",
                model: "G90 5.0 Ultimate",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "5.0L V8",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Uyuni White",
                features: "Executive package, Lexicon audio, semi-autonomous driving, massage seats, ambient lighting",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Maserati",
                model: "Quattroporte Trofeo",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "3.8L V8 Twin Turbo",
                transmission: "automatic" as const,
                seating_capacity: 5,
                color: "Blu Nettuno",
                features: "Carbon fiber interior, Bowers & Wilkins audio, adaptive suspension, luxury leather, performance modes",
                vehicle_category: "four_wheeler" as const
            },
            // Convertibles
            {
                manufacturer: "Bentley",
                model: "Continental GT Convertible",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "6.0L W12 Twin Turbo",
                transmission: "automatic" as const,
                seating_capacity: 4,
                color: "Beluga Black",
                features: "Soft-top convertible, diamond-quilted leather, Naim audio, massage seats, all-wheel drive",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Aston Martin",
                model: "DB11 Volante",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "4.0L V8 Twin Turbo",
                transmission: "automatic" as const,
                seating_capacity: 4,
                color: "Racing Green",
                features: "Fabric soft-top, premium leather, adaptive dampers, limited slip differential, launch control",
                vehicle_category: "four_wheeler" as const
            },
            // Commercial Vehicles
            {
                manufacturer: "Mercedes-Benz",
                model: "Sprinter 3500 Executive",
                year: 2024,
                fuel_type: "diesel" as const,
                engine_capacity: "3.0L V6 Turbo Diesel",
                transmission: "automatic" as const,
                seating_capacity: 12,
                color: "Arctic White",
                features: "Executive seating, WiFi hotspot, premium sound, LED lighting, rear entertainment, climate control",
                vehicle_category: "commercial" as const
            },
            {
                manufacturer: "Ford",
                model: "Transit 350 Luxury",
                year: 2024,
                fuel_type: "petrol" as const,
                engine_capacity: "3.5L V6 EcoBoost",
                transmission: "automatic" as const,
                seating_capacity: 15,
                color: "Oxford White",
                features: "Leather seating, dual-zone climate, premium audio, power doors, rear camera, cargo space",
                vehicle_category: "commercial" as const
            },
            // Hybrid Vehicles
            {
                manufacturer: "Toyota",
                model: "Prius Prime Limited",
                year: 2024,
                fuel_type: "hybrid" as const,
                engine_capacity: "2.0L Hybrid",
                transmission: "cvt" as const,
                seating_capacity: 5,
                color: "Supersonic Red",
                features: "Solar roof panel, JBL audio, wireless charging, safety sense 2.0, adaptive cruise control",
                vehicle_category: "four_wheeler" as const
            },
            {
                manufacturer: "Lexus",
                model: "RX 450h F Sport",
                year: 2024,
                fuel_type: "hybrid" as const,
                engine_capacity: "3.5L V6 Hybrid",
                transmission: "cvt" as const,
                seating_capacity: 5,
                color: "Caviar",
                features: "F Sport package, Mark Levinson audio, panoramic roof, heads-up display, safety system+",
                vehicle_category: "four_wheeler" as const
            }
        ];

        let insertedSpecs;
        try {
            insertedSpecs = await db
                .insert(vehicleSpecifications)
                .values(vehicleSpecsData)
                .returning();
            console.log(`✅ Created ${insertedSpecs.length} new vehicle specifications`);
        } catch (error: any) {
            if (error.cause?.code === '23505' || error.message?.includes('duplicate key')) {
                console.log("ℹ️  Some vehicle specifications already exist, fetching existing specs...");
                insertedSpecs = await db.select().from(vehicleSpecifications);
                console.log(`✅ Using ${insertedSpecs.length} existing vehicle specifications`);
            } else {
                throw error;
            }
        }

        // ===== VEHICLES (20 per location) =====
        console.log("🚗 Creating vehicles (20 per location)...");

        const allVehicles = [];
        const licensePlateCounters = new Map();

        for (const location of insertedLocations) {
            console.log(`  Creating vehicles for ${location.name}...`);

            for (let i = 0; i < 20; i++) {
                // Rotate through different vehicle specifications
                const specIndex = i % insertedSpecs.length;
                const spec = insertedSpecs[specIndex];

                // Generate unique license plate
                const stateCode = location.name.includes('New York') ? 'NY' :
                    location.name.includes('California') ? 'CA' :
                        location.name.includes('Florida') ? 'FL' :
                            location.name.includes('Illinois') ? 'IL' : 'NV';

                const plateCounter = licensePlateCounters.get(stateCode) || 1000;
                const licensePlate = `${stateCode}-${plateCounter + i}-VR`;
                licensePlateCounters.set(stateCode, plateCounter + 20);

                // Generate realistic rental rates based on vehicle type
                let baseRate = 150; // Default rate
                if (spec.manufacturer === 'Ferrari' || spec.manufacturer === 'Lamborghini') {
                    baseRate = 1500;
                } else if (spec.manufacturer === 'Porsche' || spec.manufacturer === 'Bentley' || spec.manufacturer === 'Aston Martin') {
                    baseRate = 800;
                } else if (spec.manufacturer === 'Mercedes-Benz' || spec.manufacturer === 'BMW' || spec.manufacturer === 'Audi') {
                    baseRate = 400;
                } else if (spec.manufacturer === 'Tesla' || spec.manufacturer === 'Lucid') {
                    baseRate = 350;
                } else if (spec.vehicle_category === 'commercial') {
                    baseRate = 200;
                }

                // Add some variation to rates
                const finalRate = baseRate + (Math.random() * 100 - 50);

                const vehicleData = {
                    vehicleSpec_id: spec.vehicleSpec_id,
                    location_id: location.location_id,
                    rental_rate: finalRate.toFixed(2),
                    availability: Math.random() > 0.2, // 80% available
                    status: Math.random() > 0.9 ? 'maintenance' : 'available' as const,
                    license_plate: licensePlate,
                    mileage: Math.floor(Math.random() * 50000) + 1000,
                    fuel_level: Math.floor(Math.random() * 100) + 1,
                    last_service_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
                    next_service_due: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000),
                    last_cleaned: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                    insurance_expiry: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
                    registration_expiry: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
                    acquisition_date: new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000), // Up to 3 years ago
                    acquisition_cost: (finalRate * 365 * (2 + Math.random() * 3)).toFixed(2), // 2-5 years worth of daily rental
                    depreciation_rate: (5 + Math.random() * 15).toFixed(2), // 5-20% annual depreciation
                    condition_rating: Math.floor(Math.random() * 3) + 8, // 8-10 rating
                    gps_tracking_id: `GPS-${licensePlate}-${Date.now()}`,
                    is_damaged: Math.random() > 0.95, // 5% chance of damage
                    damage_description: Math.random() > 0.95 ? "Minor scratch on rear bumper" : null,
                    notes: `Premium ${spec.manufacturer} ${spec.model} - Excellent condition, well-maintained`
                };

                allVehicles.push(vehicleData);
            }
        }

        // Insert all vehicles in batches for better performance
        const batchSize = 50;
        const insertedVehicles = [];

        for (let i = 0; i < allVehicles.length; i += batchSize) {
            const batch = allVehicles.slice(i, i + batchSize);
            try {
                const batchResult = await db
                    .insert(vehicles)
                    .values(batch)
                    .returning();
                insertedVehicles.push(...batchResult);
                console.log(`  Inserted vehicles batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allVehicles.length / batchSize)}`);
            } catch (error: any) {
                if (error.cause?.code === '23505' || error.message?.includes('duplicate key')) {
                    console.log(`  ⚠️  Some vehicles in batch ${Math.floor(i / batchSize) + 1} already exist, skipping duplicates...`);
                    // Try inserting one by one to skip duplicates
                    for (const vehicleData of batch) {
                        try {
                            const singleResult = await db
                                .insert(vehicles)
                                .values([vehicleData])
                                .returning();
                            insertedVehicles.push(...singleResult);
                        } catch (singleError: any) {
                            if (!(singleError.cause?.code === '23505' || singleError.message?.includes('duplicate key'))) {
                                throw singleError;
                            }
                        }
                    }
                } else {
                    throw error;
                }
            }
        }

        console.log(`✅ Created ${insertedVehicles.length} vehicles total`);

        // ===== VEHICLE IMAGES (360-degree and premium photos) =====
        console.log("📸 Creating vehicle images (360-degree and premium photos)...");

        // High-quality 360-degree and premium vehicle images from various sources
        const premiumVehicleImages: { [key: string]: string[] } = {
            // Luxury Cars
            "Mercedes-Benz S-Class": [
                "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80", // Mercedes S-Class front
                "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80&fit=crop&crop=entropy&cs=tinysrgb", // 360 view
                "https://images.unsplash.com/photo-1617654112467-7c6c4d92e135?w=800&q=80", // Interior
                "https://images.unsplash.com/photo-1605559911160-a863d3ce8a98?w=800&q=80", // Side profile
                "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80"  // Rear view
            ],
            "BMW 7 Series": [
                "https://images.unsplash.com/photo-1549399592-45d8bcafcda3?w=800&q=80",
                "https://images.unsplash.com/photo-1617654112467-7c6c4d92e135?w=800&q=80",
                "https://images.unsplash.com/photo-1549927681-0b673b922092?w=800&q=80",
                "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
                "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80"
            ],
            "Audi A8": [
                "https://images.unsplash.com/photo-1544829099-b9f0ce8f6d88?w=800&q=80",
                "https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?w=800&q=80",
                "https://images.unsplash.com/photo-1605559911160-a863d3ce8a98?w=800&q=80",
                "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80",
                "https://images.unsplash.com/photo-1614162692292-7ac56d7f7640?w=800&q=80"
            ],
            // Sports Cars
            "Porsche 911": [
                "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
                "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80",
                "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
                "https://images.unsplash.com/photo-1605559911160-a863d3ce8a98?w=800&q=80",
                "https://images.unsplash.com/photo-1614162692292-7ac56d7f7640?w=800&q=80"
            ],
            "Ferrari F8": [
                "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
                "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80",
                "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
                "https://images.unsplash.com/photo-1605559911160-a863d3ce8a98?w=800&q=80",
                "https://images.unsplash.com/photo-1614162692292-7ac56d7f7640?w=800&q=80"
            ],
            // SUVs
            "Range Rover": [
                "https://images.unsplash.com/photo-1549399592-45d8bcafcda3?w=800&q=80",
                "https://images.unsplash.com/photo-1617654112467-7c6c4d92e135?w=800&q=80",
                "https://images.unsplash.com/photo-1549927681-0b673b922092?w=800&q=80",
                "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
                "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80"
            ],
            // Electric Vehicles
            "Tesla Model S": [
                "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80",
                "https://images.unsplash.com/photo-1617654112467-7c6c4d92e135?w=800&q=80",
                "https://images.unsplash.com/photo-1549927681-0b673b922092?w=800&q=80",
                "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
                "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80"
            ],
            // Default fallback images for other vehicles
            "default": [
                "https://images.unsplash.com/photo-1549399592-45d8bcafcda3?w=800&q=80",
                "https://images.unsplash.com/photo-1617654112467-7c6c4d92e135?w=800&q=80",
                "https://images.unsplash.com/photo-1549927681-0b673b922092?w=800&q=80",
                "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
                "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80"
            ]
        };

        const allVehicleImages = [];

        for (const vehicle of insertedVehicles) {
            // Find the vehicle spec to get manufacturer and model
            const vehicleSpec = insertedSpecs.find((spec: any) => spec.vehicleSpec_id === vehicle.vehicleSpec_id);
            const vehicleKey = `${vehicleSpec?.manufacturer} ${vehicleSpec?.model?.split(' ')[0]}`;

            // Get appropriate images or fallback to default
            const imageUrls = premiumVehicleImages[vehicleKey] || premiumVehicleImages["default"];

            // Create images for this vehicle
            for (let i = 0; i < imageUrls.length; i++) {
                const imageData = {
                    vehicle_id: vehicle.vehicle_id,
                    url: imageUrls[i],
                    cloudinary_public_id: `vehicle_${vehicle.vehicle_id}_${i}`,
                    alt: `${vehicleSpec?.manufacturer} ${vehicleSpec?.model} - View ${i + 1}`,
                    caption: i === 0 ? "Main exterior view" :
                        i === 1 ? "360-degree interactive view" :
                            i === 2 ? "Interior view" :
                                i === 3 ? "Side profile" : "Rear view",
                    is_primary: i === 0,
                    is_360: i === 1, // Second image is 360-degree
                    display_order: i,
                    file_size: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
                    mime_type: "image/jpeg"
                };

                allVehicleImages.push(imageData);
            }
        }

        // Insert vehicle images in batches
        const imageBatchSize = 100;
        let totalImagesInserted = 0;

        for (let i = 0; i < allVehicleImages.length; i += imageBatchSize) {
            const batch = allVehicleImages.slice(i, i + imageBatchSize);
            try {
                await db.insert(vehicleImages).values(batch);
                totalImagesInserted += batch.length;
                console.log(`  Inserted image batch ${Math.floor(i / imageBatchSize) + 1}/${Math.ceil(allVehicleImages.length / imageBatchSize)}`);
            } catch (error: any) {
                if (error.cause?.code === '23505' || error.message?.includes('duplicate key')) {
                    console.log(`  ⚠️  Some images in batch ${Math.floor(i / imageBatchSize) + 1} already exist, skipping duplicates...`);
                    // Try inserting one by one to skip duplicates
                    for (const imageData of batch) {
                        try {
                            await db.insert(vehicleImages).values([imageData]);
                            totalImagesInserted += 1;
                        } catch (singleError: any) {
                            if (!(singleError.cause?.code === '23505' || singleError.message?.includes('duplicate key'))) {
                                throw singleError;
                            }
                        }
                    }
                } else {
                    throw error;
                }
            }
        }

        console.log(`✅ Created ${totalImagesInserted} vehicle images`);

        // ===== SUMMARY =====
        console.log("\n🎉 SEEDING COMPLETED SUCCESSFULLY!");
        console.log("=====================================");
        console.log(`👤 Admin Users: 1`);
        console.log(`📍 Locations: ${insertedLocations.length}`);
        console.log(`🚙 Vehicle Specifications: ${insertedSpecs.length}`);
        console.log(`🚗 Vehicles: ${insertedVehicles.length} (20 per location)`);
        console.log(`📸 Vehicle Images: ${totalImagesInserted} (5 per vehicle, including 360°)`);
        console.log("=====================================");

        // Location breakdown
        console.log("\n📊 VEHICLES PER LOCATION:");
        for (const location of insertedLocations) {
            const locationVehicles = insertedVehicles.filter(v => v.location_id === location.location_id);
            console.log(`  ${location.name}: ${locationVehicles.length} vehicles`);
        }

        console.log("\n🔐 ADMIN LOGIN CREDENTIALS:");
        console.log("Email: admin@vehiclerental.com");
        console.log("Password: admin123!");
        console.log("\n✨ Your vehicle rental database is ready for presentations!");

    } catch (error) {
        console.error("❌ Error during seeding:", error);
        throw error;
    }
}

// Execute the seeding
vehiclesFocusedSeed()
    .then(() => {
        console.log("✅ Seeding completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    });
