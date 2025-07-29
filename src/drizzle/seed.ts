import "dotenv/config";
import bcrypt from "bcrypt";
import db, { pool } from "./db";
import {
    users,
    vehicleSpecifications,
    vehicles,
    vehicleImages,
    locations,
    bookings,
    payments,
    supportTickets,
    maintenanceRecords
} from "./schema";

async function seed() {
    console.log("🌱 Starting to seed the Vehicle Renting Management System database...");

    try {
        // Clear existing data if needed (for development only)
        const shouldClearData = process.argv.includes('--clear') || process.argv.includes('--force');

        if (shouldClearData) {
            console.log("🧹 Clearing existing data...");

            // Delete in reverse order of dependencies
            await db.delete(maintenanceRecords);
            await db.delete(supportTickets);
            await db.delete(payments);
            await db.delete(bookings);
            await db.delete(vehicles);
            await db.delete(vehicleSpecifications);
            await db.delete(users);
            await db.delete(locations);

            console.log("✅ Existing data cleared successfully!");
        }

        // ===== LOCATIONS =====
        console.log("📍 Seeding locations...");
        const [nairobi] = await db
            .insert(locations)
            .values({
                name: "Nairobi Central Branch",
                address: "Kimathi Street, Nairobi CBD, Nairobi County",
                contact_phone: "+254710123456",
            })
            .returning();

        const [mombasa] = await db
            .insert(locations)
            .values({
                name: "Mombasa Coastal Branch",
                address: "Moi Avenue, Mombasa Island, Mombasa County",
                contact_phone: "+254711234567",
            })
            .returning();

        const [kisumu] = await db
            .insert(locations)
            .values({
                name: "Kisumu Lakeside Branch",
                address: "Oginga Odinga Street, Kisumu Central, Kisumu County",
                contact_phone: "+254712345678",
            })
            .returning();

        const [nakuru] = await db
            .insert(locations)
            .values({
                name: "Nakuru Rift Valley Branch",
                address: "Kenyatta Avenue, Nakuru Town, Nakuru County",
                contact_phone: "+254713456789",
            })
            .returning();

        const [eldoret] = await db
            .insert(locations)
            .values({
                name: "Eldoret Highland Branch",
                address: "Uganda Road, Eldoret Town, Uasin Gishu County",
                contact_phone: "+254714567890",
            })
            .returning();

        // ===== USERS =====
        console.log("👥 Seeding users...");
        const hashedPasswordUser = await bcrypt.hash("user123", 10);
        const hashedPasswordAdmin = await bcrypt.hash("admin123", 10);

        const [calebAdmin] = await db
            .insert(users)
            .values({
                firstname: "Caleb",
                lastname: "Ogeto",
                email: "calebogeto1@gmail.com",
                password: hashedPasswordAdmin,
                contact_phone: "+254700000000",
                address: "Head Office, Nairobi",
                role: "admin",
            })
            .returning();

        const [calebUser] = await db
            .insert(users)
            .values({
                firstname: "Caleb",
                lastname: "Ogeto",
                email: "calebogeto01@gmail.com",
                password: hashedPasswordUser,
                contact_phone: "+254720123456",
                address: "Karen Estate, Nairobi",
                role: "user",
            })
            .returning();

        const [pitasUser] = await db
            .insert(users)
            .values({
                firstname: "Pitas",
                lastname: "Kulih",
                email: "pitaskulih@gmail.com",
                password: hashedPasswordUser,
                contact_phone: "+254721234567",
                address: "Kilifi North Coast, Mombasa",
                role: "user",
            })
            .returning();

        const [sadlaiUser] = await db
            .insert(users)
            .values({
                firstname: "Sadlai",
                lastname: "Kipiacomp",
                email: "sadlaikipiacomp@gmail.com",
                password: hashedPasswordUser,
                contact_phone: "+254722345678",
                address: "Milimani Estate, Kisumu",
                role: "user",
            })
            .returning();

        const [agentUser] = await db
            .insert(users)
            .values({
                firstname: "Jane",
                lastname: "Support",
                email: "support.agent@example.com",
                password: hashedPasswordUser,
                contact_phone: "+254723456789",
                address: "Customer Service Center, Nairobi",
                role: "support_agent",
            })
            .returning();

        // ===== VEHICLE SPECIFICATIONS =====
        console.log("🚗 Seeding vehicle specifications...");

        // Four-Wheeler Sedan Cars
        const [toyotaCorolla] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Toyota",
                model: "Corolla",
                year: 2022,
                fuel_type: "petrol",
                engine_capacity: "1.8L",
                transmission: "automatic",
                seating_capacity: 5,
                color: "White",
                features: "Air Conditioning, GPS Navigation, Bluetooth, Safety Airbags, Anti-lock Braking System",
                vehicle_category: "four_wheeler",
            })
            .returning();

        const [nissanSentra] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Nissan",
                model: "Sentra",
                year: 2021,
                fuel_type: "petrol",
                engine_capacity: "1.6L",
                transmission: "manual",
                seating_capacity: 5,
                color: "Silver",
                features: "Air Conditioning, Radio, Power Windows, Central Locking",
                vehicle_category: "four_wheeler",
            })
            .returning();

        // Four-Wheeler SUVs
        const [toyotaPrado] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Toyota",
                model: "Land Cruiser Prado",
                year: 2023,
                fuel_type: "diesel",
                engine_capacity: "2.8L",
                transmission: "automatic",
                seating_capacity: 7,
                color: "Black",
                features: "4WD, Air Conditioning, Leather Seats, GPS Navigation, Reverse Camera, Sunroof",
                vehicle_category: "four_wheeler",
            })
            .returning();

        const [mitsubishiPajero] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Mitsubishi",
                model: "Pajero",
                year: 2022,
                fuel_type: "diesel",
                engine_capacity: "3.2L",
                transmission: "manual",
                seating_capacity: 5,
                color: "Blue",
                features: "4WD, Air Conditioning, Power Steering, Electric Windows",
                vehicle_category: "four_wheeler",
            })
            .returning();

        // Two-Wheeler Motorbikes
        const [hondaCB] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Honda",
                model: "CB 150R",
                year: 2023,
                fuel_type: "petrol",
                engine_capacity: "150cc",
                transmission: "manual",
                seating_capacity: 2,
                color: "Red",
                features: "Digital Display, LED Lights, Disc Brakes, Electric Start",
                vehicle_category: "two_wheeler",
            })
            .returning();

        const [yamahaMT] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Yamaha",
                model: "MT-15",
                year: 2022,
                fuel_type: "petrol",
                engine_capacity: "155cc",
                transmission: "manual",
                seating_capacity: 2,
                color: "Black",
                features: "Digital Display, ABS, LED Lights, Keyless Start",
                vehicle_category: "two_wheeler",
            })
            .returning();

        // Four-Wheeler Electric Vehicle
        const [teslaModel3] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Tesla",
                model: "Model 3",
                year: 2023,
                fuel_type: "electric",
                engine_capacity: "75kWh Battery",
                transmission: "automatic",
                seating_capacity: 5,
                color: "White",
                features: "Autopilot, Touch Screen, Supercharging, Premium Audio, Glass Roof",
                vehicle_category: "four_wheeler",
            })
            .returning();

        // Additional Vehicle Specifications
        const [fordFocus] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Ford",
                model: "Focus",
                year: 2023,
                fuel_type: "petrol",
                engine_capacity: "2.0L",
                transmission: "manual",
                seating_capacity: 5,
                color: "Blue",
                features: "Air Conditioning, Power Steering, Electric Windows, Bluetooth",
                vehicle_category: "four_wheeler",
            })
            .returning();

        const [bmwX3] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "BMW",
                model: "X3",
                year: 2024,
                fuel_type: "diesel",
                engine_capacity: "2.0L Turbo",
                transmission: "automatic",
                seating_capacity: 5,
                color: "Black",
                features: "AWD, Premium Audio, Navigation, Leather Seats, Panoramic Sunroof",
                vehicle_category: "four_wheeler",
            })
            .returning();

        const [hondaCivic] = await db
            .insert(vehicleSpecifications)
            .values({
                manufacturer: "Honda",
                model: "Civic",
                year: 2023,
                fuel_type: "hybrid",
                engine_capacity: "1.5L Hybrid",
                transmission: "cvt",
                seating_capacity: 5,
                color: "Pearl White",
                features: "Hybrid Engine, Advanced Safety Features, Apple CarPlay, Android Auto",
                vehicle_category: "four_wheeler",
            })
            .returning();

        // ===== VEHICLES =====
        console.log("🚙 Seeding vehicles...");

        const [vehicle1] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: toyotaCorolla.vehicleSpec_id,
                rental_rate: "4500.00",
                availability: true,
                status: "available",
                license_plate: "KCA 123A",
                location_id: nairobi.location_id,
                mileage: 15000,
                fuel_level: 100,
                condition_rating: 9,
                is_damaged: false,
                notes: "Recently serviced and in excellent condition",
            })
            .returning();

        const [vehicle2] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: toyotaCorolla.vehicleSpec_id,
                rental_rate: "4500.00",
                availability: true,
                status: "available",
                license_plate: "KCA 124B",
                location_id: mombasa.location_id,
                mileage: 12000,
                fuel_level: 95,
                condition_rating: 8,
                is_damaged: false,
            })
            .returning();

        const [vehicle3] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: nissanSentra.vehicleSpec_id,
                rental_rate: "3500.00",
                availability: true,
                status: "available",
                license_plate: "KBA 456C",
                location_id: kisumu.location_id,
                mileage: 18000,
                fuel_level: 80,
                condition_rating: 7,
                is_damaged: false,
            })
            .returning();

        const [vehicle4] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: toyotaPrado.vehicleSpec_id,
                rental_rate: "8500.00",
                availability: false,
                status: "rented",
                license_plate: "KAA 789D",
                location_id: nairobi.location_id,
                mileage: 25000,
                fuel_level: 60,
                condition_rating: 9,
                is_damaged: false,
            })
            .returning();

        const [vehicle5] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: mitsubishiPajero.vehicleSpec_id,
                rental_rate: "7000.00",
                availability: true,
                status: "available",
                license_plate: "KBB 012E",
                location_id: nakuru.location_id,
                mileage: 20000,
                fuel_level: 90,
                condition_rating: 8,
                is_damaged: false,
            })
            .returning();

        const [vehicle6] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: hondaCB.vehicleSpec_id,
                rental_rate: "1200.00",
                availability: true,
                status: "available",
                license_plate: "KMCA 345F",
                location_id: mombasa.location_id,
                mileage: 5000,
                fuel_level: 100,
                condition_rating: 10,
                is_damaged: false,
            })
            .returning();

        const [vehicle7] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: yamahaMT.vehicleSpec_id,
                rental_rate: "1500.00",
                availability: true,
                status: "available",
                license_plate: "KMCB 678G",
                location_id: eldoret.location_id,
                mileage: 3000,
                fuel_level: 95,
                condition_rating: 10,
                is_damaged: false,
            })
            .returning();

        const [vehicle8] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: teslaModel3.vehicleSpec_id,
                rental_rate: "12000.00",
                availability: true,
                status: "available",
                license_plate: "KAZ 999H",
                location_id: nairobi.location_id,
                mileage: 8000,
                fuel_level: 85, // Battery level for electric vehicle
                condition_rating: 10,
                is_damaged: false,
                notes: "Latest model with full self-driving capability",
            })
            .returning();

        const [vehicle9] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: fordFocus.vehicleSpec_id,
                rental_rate: "3800.00",
                availability: true,
                status: "available",
                license_plate: "KFF 111I",
                location_id: kisumu.location_id,
                mileage: 22000,
                fuel_level: 75,
                condition_rating: 7,
                is_damaged: false,
            })
            .returning();

        const [vehicle10] = await db
            .insert(vehicles)
            .values({
                vehicleSpec_id: bmwX3.vehicleSpec_id,
                rental_rate: "9500.00",
                availability: false,
                status: "maintenance",
                license_plate: "KBM 333J",
                location_id: nairobi.location_id,
                mileage: 30000,
                fuel_level: 50,
                condition_rating: 6,
                is_damaged: false,
                notes: "Scheduled for routine maintenance",
            })
            .returning();

        // ===== VEHICLE IMAGES =====
        console.log("📸 Seeding vehicle images...");

        // Vehicle 1 (Toyota Corolla) images
        await db.insert(vehicleImages).values([
            {
                vehicle_id: vehicle1.vehicle_id,
                url: "https://res.cloudinary.com/djkqoalj0/image/upload/v1642123456/vehicle_images/toyota_corolla_front.jpg",
                cloudinary_public_id: "vehicle_images/toyota_corolla_front",
                alt: "Toyota Corolla - Front View",
                caption: "Front view of the Toyota Corolla",
                is_primary: true,
                is_360: false,
                display_order: 1,
                file_size: 245760,
                mime_type: "image/jpeg"
            },
            {
                vehicle_id: vehicle1.vehicle_id,
                url: "https://res.cloudinary.com/djkqoalj0/image/upload/v1642123456/vehicle_images/toyota_corolla_interior.jpg",
                cloudinary_public_id: "vehicle_images/toyota_corolla_interior",
                alt: "Toyota Corolla - Interior View",
                caption: "Interior view of the Toyota Corolla",
                is_primary: false,
                is_360: false,
                display_order: 2,
                file_size: 189432,
                mime_type: "image/jpeg"
            },
            {
                vehicle_id: vehicle1.vehicle_id,
                url: "https://res.cloudinary.com/djkqoalj0/image/upload/v1642123456/vehicle_images/toyota_corolla_360.jpg",
                cloudinary_public_id: "vehicle_images/toyota_corolla_360",
                alt: "Toyota Corolla - 360° View",
                caption: "Complete 360° view of the Toyota Corolla interior",
                is_primary: false,
                is_360: true,
                display_order: 3,
                file_size: 512000,
                mime_type: "image/jpeg"
            }
        ]);

        // Vehicle 8 (Tesla Model 3) images
        await db.insert(vehicleImages).values([
            {
                vehicle_id: vehicle8.vehicle_id,
                url: "https://res.cloudinary.com/djkqoalj0/image/upload/v1642123456/vehicle_images/tesla_model3_front.jpg",
                cloudinary_public_id: "vehicle_images/tesla_model3_front",
                alt: "Tesla Model 3 - Front View",
                caption: "Front view of the Tesla Model 3",
                is_primary: true,
                is_360: false,
                display_order: 1,
                file_size: 298765,
                mime_type: "image/jpeg"
            },
            {
                vehicle_id: vehicle8.vehicle_id,
                url: "https://res.cloudinary.com/djkqoalj0/image/upload/v1642123456/vehicle_images/tesla_model3_360_interior.jpg",
                cloudinary_public_id: "vehicle_images/tesla_model3_360_interior",
                alt: "Tesla Model 3 - 360° Interior",
                caption: "Complete 360° view of the Tesla Model 3 interior",
                is_primary: false,
                is_360: true,
                display_order: 2,
                file_size: 687432,
                mime_type: "image/jpeg"
            }
        ]);

        // ===== BOOKINGS =====
        console.log("📅 Seeding bookings...");

        const [booking1] = await db
            .insert(bookings)
            .values({
                user_id: calebUser.user_id,
                vehicle_id: vehicle4.vehicle_id,
                location_id: nairobi.location_id,
                booking_date: new Date("2024-12-01T09:00:00Z"),
                return_date: new Date("2024-12-05T17:00:00Z"),
                total_amount: "34000.00", // 4 days * 8500
                booking_status: "confirmed",
            })
            .returning();

        const [booking2] = await db
            .insert(bookings)
            .values({
                user_id: pitasUser.user_id,
                vehicle_id: vehicle1.vehicle_id,
                location_id: mombasa.location_id,
                booking_date: new Date("2025-01-10T08:00:00Z"),
                return_date: new Date("2025-01-12T18:00:00Z"),
                total_amount: "9000.00", // 2 days * 4500
                booking_status: "pending",
            })
            .returning();

        const [booking3] = await db
            .insert(bookings)
            .values({
                user_id: sadlaiUser.user_id,
                vehicle_id: vehicle6.vehicle_id,
                location_id: kisumu.location_id,
                booking_date: new Date("2024-11-25T10:00:00Z"),
                return_date: new Date("2024-11-26T16:00:00Z"),
                total_amount: "1200.00", // 1 day * 1200
                booking_status: "completed",
            })
            .returning();

        const [booking4] = await db
            .insert(bookings)
            .values({
                user_id: calebUser.user_id,
                vehicle_id: vehicle8.vehicle_id,
                location_id: nairobi.location_id,
                booking_date: new Date("2025-02-01T09:00:00Z"),
                return_date: new Date("2025-02-03T17:00:00Z"),
                total_amount: "24000.00", // 2 days * 12000
                booking_status: "pending",
            })
            .returning();

        const [booking5] = await db
            .insert(bookings)
            .values({
                user_id: pitasUser.user_id,
                vehicle_id: vehicle7.vehicle_id,
                location_id: eldoret.location_id,
                booking_date: new Date("2024-12-20T08:00:00Z"),
                return_date: new Date("2024-12-22T18:00:00Z"),
                total_amount: "3000.00", // 2 days * 1500
                booking_status: "cancelled",
            })
            .returning();

        // ===== PAYMENTS =====
        console.log("💳 Seeding payments...");

        const [payment1] = await db.insert(payments).values({
            booking_id: booking1.booking_id,
            user_id: calebUser.user_id,
            amount: "17000.00", // 50% deposit
            payment_status: "completed",
            payment_date: new Date("2024-11-28T14:30:00Z"),
            payment_method: "mpesa",
            transaction_id: "MPD123456789",
        }).returning();

        const [payment2] = await db.insert(payments).values({
            booking_id: booking1.booking_id,
            user_id: calebUser.user_id,
            amount: "17000.00", // Remaining 50%
            payment_status: "pending",
            payment_method: "mpesa",
        }).returning();

        const [payment3] = await db.insert(payments).values({
            booking_id: booking3.booking_id,
            user_id: pitasUser.user_id,
            amount: "1200.00", // Full payment
            payment_status: "completed",
            payment_date: new Date("2024-11-25T09:45:00Z"),
            payment_method: "stripe",
            transaction_id: "ch_1234567890abcdef",
        }).returning();

        const [payment4] = await db.insert(payments).values({
            booking_id: booking4.booking_id,
            user_id: calebUser.user_id,
            amount: "12000.00", // 50% deposit for Tesla
            payment_status: "completed",
            payment_date: new Date("2025-01-25T11:00:00Z"),
            payment_method: "stripe",
            transaction_id: "ch_tesla_deposit_001",
        }).returning();

        const [payment5] = await db.insert(payments).values({
            booking_id: booking5.booking_id,
            user_id: pitasUser.user_id,
            amount: "1500.00", // Full payment but cancelled
            payment_status: "refunded",
            payment_date: new Date("2024-12-18T10:00:00Z"),
            payment_method: "mpesa",
            transaction_id: "MPD987654321",
        }).returning();

        // ===== SUPPORT TICKETS =====
        console.log("🎫 Seeding support tickets...");

        const [ticket1] = await db.insert(supportTickets).values({
            user_id: calebUser.user_id,
            subject: "Vehicle breakdown during rental",
            description: "The Toyota Prado I rented broke down on Mombasa Road. Need immediate assistance and replacement vehicle.",
            status: "in_progress",
            priority: "high",
            category: "vehicle",
            assigned_to: agentUser.user_id,
            admin_notes: "Roadside assistance dispatched. Replacement vehicle being arranged.",
        }).returning();

        const [ticket2] = await db.insert(supportTickets).values({
            user_id: pitasUser.user_id,
            subject: "Billing inquiry",
            description: "I was charged twice for my recent booking. Please review my payment history and refund the duplicate charge.",
            status: "open",
            priority: "medium",
            category: "payment",
        }).returning();

        const [ticket3] = await db.insert(supportTickets).values({
            user_id: sadlaiUser.user_id,
            subject: "Great service experience",
            description: "Just wanted to commend your Kisumu branch for excellent customer service. The Honda CB was in perfect condition!",
            status: "resolved",
            priority: "low",
            category: "general",
            assigned_to: agentUser.user_id,
            resolution: "Thank you for the positive feedback! We've shared this with the Kisumu team.",
            resolved_at: new Date("2024-11-27T15:30:00Z"),
        }).returning();

        const [ticket4] = await db.insert(supportTickets).values({
            user_id: calebUser.user_id,
            subject: "Tesla Model 3 charging issue",
            description: "Need information about charging stations available during my upcoming rental period.",
            status: "open",
            priority: "medium",
            category: "technical",
        }).returning();

        const [ticket5] = await db.insert(supportTickets).values({
            user_id: pitasUser.user_id,
            subject: "Booking modification request",
            description: "I need to extend my rental period by one day. Is this possible?",
            status: "closed",
            priority: "low",
            category: "booking",
            assigned_to: agentUser.user_id,
            resolution: "Booking successfully extended. Updated confirmation sent via email.",
            resolved_at: new Date("2024-12-19T10:15:00Z"),
        }).returning();

        // ===== MAINTENANCE RECORDS =====
        console.log("🔧 Seeding maintenance records...");

        const [maintenance1] = await db.insert(maintenanceRecords).values({
            vehicle_id: vehicle1.vehicle_id,
            maintenance_type: "routine",
            title: "Regular Service - Oil Change & Filters",
            description: "Regular service - oil change, filters, brake inspection",
            cost: "150.00",
            maintenance_date: new Date("2024-11-15T10:00:00Z"),
            scheduled_date: new Date("2024-11-15T10:00:00Z"),
            completed_date: new Date("2024-11-15T12:30:00Z"),
            status: "completed",
            service_provider: "AutoCare Services Nairobi",
            technician_name: "John Kamau",
            parts_replaced: "Engine oil, Air filter, Oil filter",
            mileage_at_service: 14500,
            next_service_mileage: 19500,
            notes: "All systems working perfectly. Next service due at 19,500 km",
        }).returning();

        const [maintenance2] = await db.insert(maintenanceRecords).values({
            vehicle_id: vehicle4.vehicle_id,
            maintenance_type: "repair",
            title: "AC System Repair",
            description: "AC system repair and refrigerant top-up",
            cost: "280.00",
            maintenance_date: new Date("2024-10-20T14:30:00Z"),
            scheduled_date: new Date("2024-10-20T14:30:00Z"),
            completed_date: new Date("2024-10-20T16:45:00Z"),
            status: "completed",
            service_provider: "Cool Breeze Auto AC",
            technician_name: "Mary Wanjiku",
            parts_replaced: "AC compressor belt, Refrigerant",
            mileage_at_service: 24800,
            notes: "AC system working efficiently. Customer complaint resolved.",
        }).returning();

        const [maintenance3] = await db.insert(maintenanceRecords).values({
            vehicle_id: vehicle8.vehicle_id,
            maintenance_type: "inspection",
            title: "Tesla Software Update & Battery Check",
            description: "Tesla software update and battery health check",
            cost: "0.00",
            maintenance_date: new Date("2024-12-01T09:00:00Z"),
            scheduled_date: new Date("2024-12-01T09:00:00Z"),
            completed_date: new Date("2024-12-01T10:30:00Z"),
            status: "completed",
            service_provider: "Tesla Service Center",
            technician_name: "David Kim",
            mileage_at_service: 7800,
            warranty_info: "Software update covered under warranty",
            notes: "Battery health: 98%. Software updated to latest version 2024.32.7",
        }).returning();

        const [maintenance4] = await db.insert(maintenanceRecords).values({
            vehicle_id: vehicle10.vehicle_id,
            maintenance_type: "routine",
            title: "30,000 KM Major Service",
            description: "30,000 km major service - engine, transmission, brakes",
            cost: "450.00",
            maintenance_date: new Date("2025-01-05T11:00:00Z"),
            scheduled_date: new Date("2025-01-05T11:00:00Z"),
            status: "in_progress",
            service_provider: "BMW Service Center",
            technician_name: "Robert Schmidt",
            parts_replaced: "Engine oil, Transmission fluid, Brake pads, Air filter, Cabin filter",
            mileage_at_service: 30000,
            next_service_mileage: 35000,
            notes: "Major service in progress. Vehicle temporarily unavailable.",
        }).returning();

        const [maintenance5] = await db.insert(maintenanceRecords).values({
            vehicle_id: vehicle6.vehicle_id,
            maintenance_type: "cleaning",
            title: "Deep Vehicle Cleaning & Sanitization",
            description: "Deep cleaning and sanitization after rental return",
            cost: "25.00",
            maintenance_date: new Date("2024-11-26T16:30:00Z"),
            scheduled_date: new Date("2024-11-26T16:30:00Z"),
            completed_date: new Date("2024-11-26T17:30:00Z"),
            status: "completed",
            service_provider: "SparkleClean Auto Detailing",
            mileage_at_service: 5000,
            notes: "Vehicle cleaned and ready for next rental",
        }).returning();

        console.log("✅ Seeding complete! Database has been populated with:");
        console.log("  📍 5 Kenyan locations (Nairobi, Mombasa, Kisumu, Nakuru, Eldoret)");
        console.log("  👥 5 users (3 customers + 1 admin + 1 support agent)");
        console.log("  🚗 10 vehicle specifications categorized as:");
        console.log("    🚙 8 Four-wheelers (Toyota, Nissan, Mitsubishi, Tesla, Ford, BMW, Honda)");
        console.log("    🏍️  2 Two-wheelers (Honda CB 150R, Yamaha MT-15)");
        console.log("  🚙 10 vehicle instances with Kenyan license plates");
        console.log("  📅 5 bookings with different statuses (confirmed, pending, completed, cancelled)");
        console.log("  💳 5 payment records (M-Pesa & Stripe)");
        console.log("  🎫 5 support tickets with various categories and priorities");
        console.log("  🔧 5 maintenance records with different types and statuses");
        console.log("\n🔐 Test Login Credentials:");
        console.log("  👤 User: calebogeto01@gmail.com / user123");
        console.log("  👤 User: pitaskulih@gmail.com / user123");
        console.log("  👤 User: sadlaikipiacomp@gmail.com / user123");
        console.log("  🔧 Admin: calebogeto1@gmail.com / admin123");
        console.log("  🎧 Support Agent: support.agent@example.com / user123");

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        throw error;
    }
}

seed()
    .then(async () => {
        console.log("🎉 Seeding process completed successfully!");
        // await pool.end(); // Disabled for Neon - no pool connection needed
        process.exit(0);
    })
    .catch(async (e) => {
        console.error("💥 Seeding process failed:", e);
        // await pool.end(); // Disabled for Neon - no pool connection needed
        process.exit(1);
    });