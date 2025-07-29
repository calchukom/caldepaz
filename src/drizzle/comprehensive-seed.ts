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
    bookings,
    payments,
    supportTickets,
    maintenanceRecords,
    maintenanceSchedules
} from "./schema";

async function comprehensiveSeed() {
    console.log("🌱 Starting comprehensive seeding of the Vehicle Rental Management System...");

    try {
        // Clear existing data if needed (for development only)
        const shouldClearData = process.argv.includes('--clear') || process.argv.includes('--force');

        if (shouldClearData) {
            console.log("🧹 Clearing existing data...");

            // Delete in reverse order of dependencies
            await db.delete(maintenanceSchedules);
            await db.delete(maintenanceRecords);
            await db.delete(supportTickets);
            await db.delete(payments);
            await db.delete(bookings);
            await db.delete(vehicleImages);
            await db.delete(vehicles);
            await db.delete(vehicleSpecifications);
            await db.delete(users);
            await db.delete(locations);

            console.log("✅ Existing data cleared successfully!");
        }

        // ===== DIFFERENT LOCATIONS (International branches) =====
        console.log("📍 Seeding international branch locations...");
        const [kampala] = await db
            .insert(locations)
            .values({
                name: "Kampala Downtown Branch",
                address: "Plot 42, Kampala Road, Central Division, Kampala, Uganda",
                contact_phone: "+256701234567",
            })
            .returning();

        const [kigali] = await db
            .insert(locations)
            .values({
                name: "Kigali Business District",
                address: "KN 3 Ave, Nyarugenge, Kigali City, Rwanda",
                contact_phone: "+250788123456",
            })
            .returning();

        const [dar] = await db
            .insert(locations)
            .values({
                name: "Dar es Salaam Central Hub",
                address: "Samora Avenue, Ilala District, Dar es Salaam, Tanzania",
                contact_phone: "+255754123456",
            })
            .returning();

        const [addis] = await db
            .insert(locations)
            .values({
                name: "Addis Ababa Premium Station",
                address: "Bole Road, Addis Ketema, Addis Ababa, Ethiopia",
                contact_phone: "+251911123456",
            })
            .returning();

        const [lagos] = await db
            .insert(locations)
            .values({
                name: "Lagos Victoria Island",
                address: "Tiamiyu Savage Street, Victoria Island, Lagos, Nigeria",
                contact_phone: "+234803123456",
            })
            .returning();

        const [accra] = await db
            .insert(locations)
            .values({
                name: "Accra Airport City Branch",
                address: "Liberation Link, Airport City, Greater Accra, Ghana",
                contact_phone: "+233244123456",
            })
            .returning();

        console.log("✅ Locations seeded successfully!");

        // ===== DIVERSE USERS (Different from basic seed) =====
        console.log("👥 Seeding diverse user base...");

        // Check existing users to avoid duplicates
        const existingUsers = await db.select().from(users);
        const existingEmails = new Set(existingUsers.map((u: any) => u.email));

        // Hash password for all users
        const hashedPassword = await bcrypt.hash("SecurePass123!", 12);

        // Helper function to create user if not exists
        const createUserIfNotExists = async (userData: any) => {
            if (existingEmails.has(userData.email)) {
                console.log(`ℹ️ User ${userData.email} already exists, skipping`);
                return existingUsers.find((u: any) => u.email === userData.email);
            }
            const [user] = await db.insert(users).values(userData).returning();
            return user;
        };

        // International Admin
        const globalAdmin = await createUserIfNotExists({
            email: "global.admin@rentalmax.com",
            password: hashedPassword,
            firstname: "Alexandra",
            lastname: "Rodriguez",
            contact_phone: "+1-555-0199",
            role: 'admin',
            created_at: new Date('2024-01-15'),
            updated_at: new Date('2024-01-15')
        });

        // Regional Managers
        const eastAfricaManager = await createUserIfNotExists({
            email: "eastafrica.manager@rentalmax.com",
            password: hashedPassword,
            firstname: "Amara",
            lastname: "Okonkwo",
            contact_phone: "+256700999888",
            role: 'admin',
            created_at: new Date('2024-02-01'),
            updated_at: new Date('2024-02-01')
        });

        const westAfricaManager = await createUserIfNotExists({
            email: "westafrica.manager@rentalmax.com",
            password: hashedPassword,
            firstname: "Kwame",
            lastname: "Asante",
            contact_phone: "+233244888777",
            role: 'admin',
            created_at: new Date('2024-02-10'),
            updated_at: new Date('2024-02-10')
        });

        // Fleet Owners (using 'user' role with special business accounts)
        const luxuryFleetOwner = await createUserIfNotExists({
            email: "luxury.fleet@rentalmax.com",
            password: hashedPassword,
            firstname: "Isabella",
            lastname: "Mbeki",
            contact_phone: "+27821123456",
            role: 'user',
            created_at: new Date('2024-03-01'),
            updated_at: new Date('2024-03-01')
        });

        const commercialFleetOwner = await createUserIfNotExists({
            email: "commercial.fleet@rentalmax.com",
            password: hashedPassword,
            firstname: "Dmitri",
            lastname: "Petrov",
            contact_phone: "+7495123456789",
            role: 'user',
            created_at: new Date('2024-03-15'),
            updated_at: new Date('2024-03-15')
        });

        // Professional drivers (using 'user' role)
        const premiumDriver = await createUserIfNotExists({
            email: "premium.driver@rentalmax.com",
            password: hashedPassword,
            firstname: "Mohamed",
            lastname: "Al-Rashid",
            contact_phone: "+971501234567",
            role: 'user',
            created_at: new Date('2024-04-01'),
            updated_at: new Date('2024-04-01')
        });

        const tourDriver = await createUserIfNotExists({
            email: "tour.driver@rentalmax.com",
            password: hashedPassword,
            firstname: "Fatima",
            lastname: "Benali",
            contact_phone: "+212661234567",
            role: 'user',
            created_at: new Date('2024-04-15'),
            updated_at: new Date('2024-04-15')
        });

        // Premium customers
        const corporateClient = await createUserIfNotExists({
            email: "corporate.client@techcorp.com",
            password: hashedPassword,
            firstname: "James",
            lastname: "Wellington",
            contact_phone: "+44207123456",
            role: 'user',
            created_at: new Date('2024-05-01'),
            updated_at: new Date('2024-05-01')
        });

        const vipCustomer = await createUserIfNotExists({
            email: "vip.customer@email.com",
            password: hashedPassword,
            firstname: "Sophia",
            lastname: "Chen",
            contact_phone: "+8613912345678",
            role: 'user',
            created_at: new Date('2024-05-15'),
            updated_at: new Date('2024-05-15')
        });

        console.log("✅ Users seeded successfully!");

        // ===== PREMIUM VEHICLE SPECIFICATIONS =====
        console.log("🚗 Seeding premium vehicle specifications...");

        // Luxury sedan specifications
        const [luxurySedan] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Mercedes-Benz",
                model: "S-Class S500",
                year: 2024,
                vehicle_category: "four_wheeler",
                fuel_type: "petrol",
                transmission: "automatic",
                seating_capacity: 5,
                engine_capacity: "3.0L V6 Turbo",
                color: "Obsidian Black",
                features: JSON.stringify([
                    "Premium leather seats",
                    "Massage function",
                    "64-color ambient lighting",
                    "Burmester surround sound",
                    "Air suspension",
                    "360-degree camera",
                    "Wireless charging"
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        // Electric luxury SUV
        const [electricSUV] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Tesla",
                model: "Model X Plaid",
                year: 2024,
                vehicle_category: "four_wheeler",
                fuel_type: "electric",
                transmission: "automatic",
                seating_capacity: 7,
                engine_capacity: "Tri-Motor",
                color: "Pearl White",
                features: JSON.stringify([
                    "Falcon wing doors",
                    "17-inch touchscreen",
                    "Autopilot included",
                    "Premium audio system",
                    "Glass roof",
                    "Over-the-air updates",
                    "Bioweapon Defense Mode"
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        // Sports car
        const [sportsCar] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Porsche",
                model: "911 Turbo S",
                year: 2024,
                vehicle_category: "four_wheeler",
                fuel_type: "petrol",
                transmission: "automatic",
                seating_capacity: 4,
                engine_capacity: "3.8L Twin-Turbo H6",
                color: "Guards Red",
                features: JSON.stringify([
                    "Sport Chrono Package",
                    "Active suspension",
                    "Carbon fiber interior",
                    "Track mode",
                    "Launch control",
                    "Bose surround sound",
                    "Adaptive LED headlights"
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        // Commercial van
        const [commercialVan] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Ford",
                model: "Transit Custom",
                year: 2024,
                vehicle_category: "commercial",
                fuel_type: "diesel",
                transmission: "manual",
                seating_capacity: 3,
                engine_capacity: "2.0L EcoBlue",
                color: "Oxford White",
                features: JSON.stringify([
                    "Load capacity 1,400kg",
                    "Rear parking sensors",
                    "Cruise control",
                    "Air conditioning",
                    "Bluetooth connectivity",
                    "Multiple storage compartments",
                    "Side loading door"
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        // Off-road vehicle
        const [offRoad] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Land Rover",
                model: "Defender 110",
                year: 2024,
                vehicle_category: "four_wheeler",
                fuel_type: "diesel",
                transmission: "automatic",
                seating_capacity: 7,
                engine_capacity: "3.0L D300",
                color: "Santorini Black",
                features: JSON.stringify([
                    "Terrain Response 2",
                    "All-wheel drive",
                    "Air suspension",
                    "Wade depth 900mm",
                    "Approach angle 38°",
                    "Meridian sound system",
                    "Configurable Terrain Response"
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        // Executive minibus
        const [executiveMinibus] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Mercedes-Benz",
                model: "Sprinter Executive",
                year: 2024,
                vehicle_category: "commercial",
                fuel_type: "diesel",
                transmission: "automatic",
                seating_capacity: 16,
                engine_capacity: "2.1L CDI",
                color: "Arctic White",
                features: JSON.stringify([
                    "Executive seating",
                    "Individual climate control",
                    "Wi-Fi hotspot",
                    "USB charging ports",
                    "Premium entertainment system",
                    "Mood lighting",
                    "Privacy glass"
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        // Premium motorcycle
        const [premiumMotorcycle] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Harley-Davidson",
                model: "Street Glide Special",
                year: 2024,
                vehicle_category: "two_wheeler",
                fuel_type: "petrol",
                transmission: "manual",
                seating_capacity: 2,
                engine_capacity: "1.9L V-Twin",
                color: "Vivid Black",
                features: JSON.stringify([
                    "Milwaukee-Eight 114 engine",
                    "Infotainment system",
                    "Reflex Linked Brakes",
                    "Security system",
                    "LED lighting",
                    "Tour-Pak luggage",
                    "Comfortable touring seat"
                ]),
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        console.log("✅ Vehicle specifications seeded successfully!");

        // ===== ACTUAL VEHICLES =====
        console.log("🚙 Seeding actual vehicle inventory...");

        // Check existing vehicles to avoid license plate conflicts
        const existingVehicles = await db.select({ license_plate: vehicles.license_plate }).from(vehicles);
        const existingPlates = new Set(existingVehicles.map((v: any) => v.license_plate));

        // Helper function to create vehicle if license plate doesn't exist
        const createVehicleIfNotExists = async (vehicleData: any) => {
            if (existingPlates.has(vehicleData.license_plate)) {
                console.log(`ℹ️ Vehicle ${vehicleData.license_plate} already exists, skipping`);
                return null;
            }
            const [vehicle] = await db.insert(vehicles).values(vehicleData).returning();
            return vehicle;
        };

        // Luxury sedans (using INT- prefix for international)
        const luxurySedans = [];
        for (let i = 1; i <= 3; i++) {
            const vehicle = await createVehicleIfNotExists({
                vehicleSpec_id: luxurySedan.vehicleSpec_id,
                license_plate: `INT-LUX-${String(i).padStart(3, '0')}`,
                location_id: i === 1 ? kampala.location_id : i === 2 ? kigali.location_id : dar.location_id,
                rental_rate: "150.00",
                status: i === 1 ? 'available' : i === 2 ? 'rented' : 'available',
                mileage: 2000 + (i * 500),
                fuel_level: 100,
                last_service_date: new Date('2024-06-01'),
                next_service_due: new Date('2024-08-01'),
                insurance_expiry: new Date('2025-07-01'),
                registration_expiry: new Date('2025-12-31'),
                condition_rating: 10,
                acquisition_date: new Date('2024-01-01'),
                acquisition_cost: "85000.00"
            });
            if (vehicle) luxurySedans.push(vehicle);
        }

        // Electric SUVs
        const electricSUVs = [];
        for (let i = 1; i <= 2; i++) {
            const vehicle = await createVehicleIfNotExists({
                vehicleSpec_id: electricSUV.vehicleSpec_id,
                license_plate: `INT-ELC-${String(i).padStart(3, '0')}`,
                location_id: i === 1 ? addis.location_id : lagos.location_id,
                rental_rate: "200.00",
                status: 'available',
                mileage: 1000 + (i * 300),
                fuel_level: 100,
                last_service_date: new Date('2024-06-15'),
                next_service_due: new Date('2024-09-15'),
                insurance_expiry: new Date('2025-08-01'),
                registration_expiry: new Date('2025-12-31'),
                condition_rating: 10,
                acquisition_date: new Date('2024-02-01'),
                acquisition_cost: "120000.00"
            });
            if (vehicle) electricSUVs.push(vehicle);
        }

        // Sports cars
        const sportsCars = [];
        for (let i = 1; i <= 2; i++) {
            const vehicle = await createVehicleIfNotExists({
                vehicleSpec_id: sportsCar.vehicleSpec_id,
                license_plate: `INT-SPR-${String(i).padStart(3, '0')}`,
                location_id: i === 1 ? accra.location_id : kampala.location_id,
                rental_rate: "300.00",
                status: i === 1 ? 'available' : 'maintenance',
                condition_rating: 10,
                mileage: 800 + (i * 200),
                fuel_level: 100,
                last_service_date: new Date('2024-07-01'),
                next_service_due: new Date('2024-10-01'),
                insurance_expiry: new Date('2025-09-01'),
                registration_expiry: new Date('2025-12-31'),
                acquisition_date: new Date('2024-03-01'),
                acquisition_cost: "95000.00"
            });
            if (vehicle) sportsCars.push(vehicle);
        }

        // Commercial vans
        const commercialVans = [];
        for (let i = 1; i <= 4; i++) {
            const vehicle = await createVehicleIfNotExists({
                vehicleSpec_id: commercialVan.vehicleSpec_id,
                license_plate: `INT-COM-${String(i).padStart(3, '0')}`,
                location_id: [kampala.location_id, kigali.location_id, dar.location_id, addis.location_id][i - 1],
                rental_rate: "80.00",
                status: i % 2 === 0 ? 'available' : 'rented',
                condition_rating: i <= 2 ? 10 : 8,
                mileage: 15000 + (i * 2000),
                fuel_level: 100,
                last_service_date: new Date('2024-05-15'),
                next_service_due: new Date('2024-08-15'),
                insurance_expiry: new Date('2025-06-01'),
                registration_expiry: new Date('2025-12-31'),
                acquisition_date: new Date('2024-01-15'),
                acquisition_cost: "45000.00"
            });
            if (vehicle) commercialVans.push(vehicle);
        }

        // Off-road vehicles
        const offRoadVehicles = [];
        for (let i = 1; i <= 3; i++) {
            const vehicle = await createVehicleIfNotExists({
                vehicleSpec_id: offRoad.vehicleSpec_id,
                license_plate: `INT-OFF-${String(i).padStart(3, '0')}`,
                location_id: i === 1 ? dar.location_id : i === 2 ? addis.location_id : lagos.location_id,
                rental_rate: "120.00",
                status: 'available',
                condition_rating: 10,
                mileage: 5000 + (i * 1000),
                fuel_level: 100,
                last_service_date: new Date('2024-06-10'),
                next_service_due: new Date('2024-09-10'),
                insurance_expiry: new Date('2025-07-15'),
                registration_expiry: new Date('2025-12-31'),
                acquisition_date: new Date('2024-02-15'),
                acquisition_cost: "75000.00"
            });
            if (vehicle) offRoadVehicles.push(vehicle);
        }

        // Executive minibuses
        const executiveMinibuses = [];
        for (let i = 1; i <= 2; i++) {
            const vehicle = await createVehicleIfNotExists({
                vehicleSpec_id: executiveMinibus.vehicleSpec_id,
                license_plate: `INT-EXE-${String(i).padStart(3, '0')}`,
                location_id: i === 1 ? accra.location_id : kampala.location_id,
                rental_rate: "180.00",
                status: 'available',
                condition_rating: 10,
                mileage: 8000 + (i * 1500),
                fuel_level: 100,
                last_service_date: new Date('2024-06-20'),
                next_service_due: new Date('2024-09-20'),
                insurance_expiry: new Date('2025-08-15'),
                registration_expiry: new Date('2025-12-31'),
                acquisition_date: new Date('2024-03-01'),
                acquisition_cost: "68000.00"
            });
            if (vehicle) executiveMinibuses.push(vehicle);
        }

        console.log("✅ Vehicle inventory seeded successfully!");

        // ===== PREMIUM BOOKINGS =====
        console.log("📅 Seeding premium bookings...");

        // Get existing vehicles to create bookings with
        const allVehicles = await db.select().from(vehicles);
        const luxurySedanVehicles = allVehicles.filter((v: any) => v.license_plate?.startsWith('INT-LUX-'));
        const sportsCarVehicles = allVehicles.filter((v: any) => v.license_plate?.startsWith('INT-SPR-'));
        const commercialVanVehicles = allVehicles.filter((v: any) => v.license_plate?.startsWith('INT-COM-'));

        // Check if bookings already exist to avoid duplicate bookings
        const existingBookings = await db.select().from(bookings);

        let currentBooking1: any = null;
        let upcomingBooking: any = null;
        let commercialBooking: any = null;

        if (existingBookings.length < 10 && luxurySedanVehicles.length > 1) {
            // Current booking for luxury sedan
            [currentBooking1] = await db
                .insert(bookings)
                .values({
                    vehicle_id: luxurySedanVehicles[1].vehicle_id, // The rented one
                    user_id: corporateClient.user_id,
                    location_id: kigali.location_id,
                    booking_date: new Date('2024-07-25T09:00:00Z'),
                    return_date: new Date('2024-07-30T18:00:00Z'),
                    total_amount: "750.00", // 5 days * 150
                    booking_status: 'confirmed'
                })
                .returning();

            console.log("✅ Luxury sedan booking created");
        }

        if (existingBookings.length < 10 && sportsCarVehicles.length > 0) {
            // Upcoming booking for sports car
            [upcomingBooking] = await db
                .insert(bookings)
                .values({
                    vehicle_id: sportsCarVehicles[0].vehicle_id,
                    user_id: vipCustomer.user_id,
                    location_id: accra.location_id,
                    booking_date: new Date('2024-08-15T10:00:00Z'),
                    return_date: new Date('2024-08-17T16:00:00Z'),
                    total_amount: "600.00", // 2 days * 300
                    booking_status: 'confirmed'
                })
                .returning();

            console.log("✅ Sports car booking created");
        }

        if (existingBookings.length < 10 && commercialVanVehicles.length > 0) {
            // Commercial booking
            [commercialBooking] = await db
                .insert(bookings)
                .values({
                    vehicle_id: commercialVanVehicles[0].vehicle_id,
                    user_id: corporateClient.user_id,
                    location_id: kampala.location_id,
                    booking_date: new Date('2024-07-20T08:00:00Z'),
                    return_date: new Date('2024-07-27T17:00:00Z'),
                    total_amount: "560.00", // 7 days * 80
                    booking_status: 'completed'
                })
                .returning();

            console.log("✅ Commercial booking created");
        }

        console.log("✅ Premium bookings seeded successfully!");

        // ===== PAYMENT RECORDS =====
        console.log("💳 Seeding payment records...");

        if (currentBooking1) {
            // Payment for current booking
            const [payment1] = await db
                .insert(payments)
                .values({
                    booking_id: currentBooking1.booking_id,
                    user_id: corporateClient.user_id,
                    amount: "750.00",
                    payment_method: 'credit_card',
                    payment_status: 'completed',
                    transaction_id: 'TXN_CORP_' + Date.now(),
                    payment_gateway: 'stripe',
                    currency: 'USD',
                    created_at: new Date('2024-07-20T10:30:00Z'),
                    updated_at: new Date('2024-07-20T10:30:00Z')
                })
                .returning();
        }

        if (upcomingBooking) {
            // Payment for upcoming booking  
            const [payment2] = await db
                .insert(payments)
                .values({
                    booking_id: upcomingBooking.booking_id,
                    user_id: vipCustomer.user_id,
                    amount: "600.00",
                    payment_method: 'credit_card',
                    payment_status: 'completed',
                    transaction_id: 'TXN_VIP_' + Date.now(),
                    payment_gateway: 'stripe',
                    currency: 'USD',
                    created_at: new Date('2024-07-28T14:20:00Z'),
                    updated_at: new Date('2024-07-28T14:20:00Z')
                })
                .returning();
        }

        if (commercialBooking) {
            // Payment for commercial booking
            const [payment3] = await db
                .insert(payments)
                .values({
                    booking_id: commercialBooking.booking_id,
                    user_id: corporateClient.user_id,
                    amount: "560.00",
                    payment_method: 'bank_transfer',
                    payment_status: 'completed',
                    transaction_id: 'TXN_BANK_' + Date.now(),
                    payment_gateway: 'bank_transfer',
                    currency: 'USD',
                    created_at: new Date('2024-07-15T09:15:00Z'),
                    updated_at: new Date('2024-07-15T09:15:00Z')
                })
                .returning();
        }

        console.log("✅ Payment records seeded successfully!");

        // ===== SUPPORT TICKETS =====
        console.log("🎫 Seeding support tickets...");

        // High priority technical issue
        const [techTicket] = await db
            .insert(supportTickets)
            .values({
                user_id: corporateClient.user_id,
                subject: "Vehicle GPS System Malfunction",
                description: "The GPS navigation system in vehicle LUX-002 stopped working during our corporate trip. This is affecting our business operations.",
                category: 'technical',
                priority: 'high',
                status: 'in_progress',
                assigned_to: eastAfricaManager.user_id,
                created_at: new Date('2024-07-26T11:30:00Z'),
                updated_at: new Date('2024-07-26T14:20:00Z')
            })
            .returning();

        // Vehicle maintenance request
        const [maintenanceTicket] = await db
            .insert(supportTickets)
            .values({
                user_id: vipCustomer.user_id,
                subject: "Unusual Engine Noise in Sports Car",
                description: "There's an unusual noise coming from the engine of the Porsche 911. Please check before my weekend booking.",
                category: 'vehicle',
                priority: 'medium',
                status: 'open',
                created_at: new Date('2024-07-27T16:45:00Z'),
                updated_at: new Date('2024-07-27T16:45:00Z')
            })
            .returning();

        // Payment inquiry
        const [paymentTicket] = await db
            .insert(supportTickets)
            .values({
                user_id: corporateClient.user_id,
                subject: "Invoice Request for Corporate Booking",
                description: "We need a detailed invoice for the commercial van rental for our accounting department.",
                category: 'payment',
                priority: 'low',
                status: 'resolved',
                assigned_to: westAfricaManager.user_id,
                resolution: "Invoice sent via email with all required details and tax information.",
                resolved_at: new Date('2024-07-28T10:00:00Z'),
                created_at: new Date('2024-07-27T09:20:00Z'),
                updated_at: new Date('2024-07-28T10:00:00Z')
            })
            .returning();

        console.log("✅ Support tickets seeded successfully!");

        // ===== MAINTENANCE RECORDS =====
        console.log("🔧 Seeding maintenance records...");

        // Get vehicles for maintenance records
        const luxurySedanForMaintenance = allVehicles.find((v: any) => v.license_plate === 'INT-LUX-001');
        const sportsCarForMaintenance = allVehicles.find((v: any) => v.license_plate === 'INT-SPR-002');

        if (luxurySedanForMaintenance) {
            // Scheduled maintenance for luxury sedan
            const [luxuryMaintenance] = await db
                .insert(maintenanceRecords)
                .values({
                    vehicle_id: luxurySedanForMaintenance.vehicle_id,
                    maintenance_type: 'routine',
                    title: 'Comprehensive Mercedes Service',
                    description: 'Comprehensive service: Oil change, brake inspection, tire rotation, premium detailing',
                    maintenance_date: new Date('2024-08-01'),
                    scheduled_date: new Date('2024-08-01'),
                    completion_date: new Date('2024-08-01'),
                    status: 'completed',
                    cost: "450.00",
                    service_provider: 'Mercedes-Benz Authorized Service Center',
                    notes: 'All systems checked, vehicle in excellent condition',
                    created_at: new Date('2024-07-25'),
                    updated_at: new Date('2024-08-01')
                })
                .returning();
        }

        if (sportsCarForMaintenance) {
            // Emergency repair for sports car
            const [sportsCarRepair] = await db
                .insert(maintenanceRecords)
                .values({
                    vehicle_id: sportsCarForMaintenance.vehicle_id, // The one in maintenance
                    maintenance_type: 'repair',
                    title: 'Porsche Engine Noise Investigation',
                    description: 'Engine noise investigation and turbo system inspection',
                    maintenance_date: new Date('2024-07-28'),
                    scheduled_date: new Date('2024-07-28'),
                    status: 'in_progress',
                    cost: "800.00",
                    service_provider: 'Porsche Specialist Workshop',
                    notes: 'Turbo bearing replacement required, parts ordered',
                    created_at: new Date('2024-07-27'),
                    updated_at: new Date('2024-07-28')
                })
                .returning();
        }

        console.log("✅ Maintenance records seeded successfully!");

        // ===== VEHICLE IMAGES =====
        console.log("📸 Seeding vehicle images...");

        // Get specific vehicles for images
        const luxurySedanForImages = allVehicles.find((v: any) => v.license_plate === 'INT-LUX-001');
        const sportsCarForImages = allVehicles.find((v: any) => v.license_plate === 'INT-SPR-001');

        if (luxurySedanForImages) {
            // Luxury sedan images
            await db.insert(vehicleImages).values([
                {
                    vehicle_id: luxurySedanForImages.vehicle_id,
                    url: "https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=800",
                    display_order: 1,
                    is_primary: true,
                    alt: "Mercedes S-Class exterior front view",
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    vehicle_id: luxurySedanForImages.vehicle_id,
                    url: "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?w=800",
                    display_order: 2,
                    is_primary: false,
                    alt: "Mercedes S-Class luxury interior",
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);
        }

        if (sportsCarForImages) {
            // Sports car images
            await db.insert(vehicleImages).values([
                {
                    vehicle_id: sportsCarForImages.vehicle_id,
                    url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800",
                    display_order: 1,
                    is_primary: true,
                    alt: "Porsche 911 Turbo S exterior",
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    vehicle_id: sportsCarForImages.vehicle_id,
                    url: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800",
                    display_order: 2,
                    is_primary: false,
                    alt: "Porsche 911 sport interior",
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);
        }

        console.log("✅ Vehicle images seeded successfully!");

        console.log("🎉 Comprehensive seeding completed successfully!");
        console.log("📊 Seeded data summary:");
        console.log("   - 6 International locations");
        console.log("   - 9 Diverse users (admins, owners, drivers, customers)");
        console.log("   - 6 Premium vehicle specifications");
        console.log("   - 16 Actual vehicles");
        console.log("   - 3 Premium bookings");
        console.log("   - 3 Payment records");
        console.log("   - 3 Support tickets");
        console.log("   - 2 Maintenance records");
        console.log("   - 4 Vehicle images");

    } catch (error) {
        console.error("❌ Error during comprehensive seeding:", error);
        throw error;
    }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
    comprehensiveSeed()
        .then(() => {
            console.log("✅ Comprehensive seeding completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Comprehensive seeding failed:", error);
            process.exit(1);
        });
}

export default comprehensiveSeed;
