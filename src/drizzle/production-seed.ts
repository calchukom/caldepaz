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

async function productionSeed() {
    console.log("🌱 Starting production seeding of the Vehicle Rental Management System...");

    try {
        // ===== LOCATIONS =====
        console.log("📍 Seeding locations...");
        const locationData = [
            {
                name: "Nairobi Central Branch",
                address: "Kimathi Street, Nairobi CBD, Nairobi County",
                contact_phone: "+254710123456",
            },
            {
                name: "Mombasa Coastal Branch",
                address: "Moi Avenue, Mombasa, Coast Province",
                contact_phone: "+254720234567",
            },
            {
                name: "Kisumu Lakeside Branch",
                address: "Oginga Odinga Street, Kisumu, Nyanza Province",
                contact_phone: "+254730345678",
            },
            {
                name: "Nakuru Rift Valley Branch",
                address: "Kenyatta Avenue, Nakuru, Rift Valley Province",
                contact_phone: "+254740456789",
            },
            {
                name: "Eldoret Highland Branch",
                address: "Uganda Road, Eldoret, Rift Valley Province",
                contact_phone: "+254750567890",
            }
        ];

        const insertedLocations = await db.insert(locations).values(locationData).returning();
        console.log(`✅ Seeded ${insertedLocations.length} locations`);

        // ===== USERS =====
        console.log("👥 Seeding users...");
        const hashedPassword = await bcrypt.hash("password123", 12);

        const userData = [
            {
                firstname: "Admin",
                lastname: "User",
                email: "admin@okaycarrental.com",
                password: hashedPassword,
                role: "admin" as const,
                contact_phone: "+254700000001",
                address: "Nairobi, Kenya",
                email_verified: true
            },
            {
                firstname: "John",
                lastname: "Customer",
                email: "john@example.com",
                password: hashedPassword,
                role: "member" as const,
                contact_phone: "+254700000002",
                address: "Nairobi, Kenya",
                email_verified: true
            },
            {
                firstname: "Jane",
                lastname: "Driver",
                email: "jane@example.com",
                password: hashedPassword,
                role: "driver" as const,
                contact_phone: "+254700000003",
                address: "Mombasa, Kenya",
                email_verified: true
            },
            {
                firstname: "Sarah",
                lastname: "Support",
                email: "support@okaycarrental.com",
                password: hashedPassword,
                role: "support_agent" as const,
                contact_phone: "+254700000004",
                address: "Nairobi, Kenya",
                email_verified: true
            },
            {
                firstname: "Mike",
                lastname: "Owner",
                email: "owner@okaycarrental.com",
                password: hashedPassword,
                role: "owner" as const,
                contact_phone: "+254700000005",
                address: "Kisumu, Kenya",
                email_verified: true
            }
        ];

        const insertedUsers = await db.insert(users).values(userData).returning();
        console.log(`✅ Seeded ${insertedUsers.length} users`);

        // ===== VEHICLE SPECIFICATIONS =====
        console.log("🚗 Seeding vehicle specifications...");
        const specData = [
            {
                make: "Toyota",
                model: "Corolla",
                year: 2022,
                category: "economy" as const,
                fuel_type: "petrol" as const,
                transmission: "automatic" as const,
                seating_capacity: 5,
                engine_size: "1.8L",
                fuel_efficiency: "15 km/l",
                safety_rating: 5
            },
            {
                make: "Honda",
                model: "Civic",
                year: 2023,
                category: "compact" as const,
                fuel_type: "petrol" as const,
                transmission: "automatic" as const,
                seating_capacity: 5,
                engine_size: "2.0L",
                fuel_efficiency: "14 km/l",
                safety_rating: 5
            },
            {
                make: "BMW",
                model: "X5",
                year: 2023,
                category: "luxury" as const,
                fuel_type: "petrol" as const,
                transmission: "automatic" as const,
                seating_capacity: 7,
                engine_size: "3.0L",
                fuel_efficiency: "10 km/l",
                safety_rating: 5
            },
            {
                make: "Toyota",
                model: "Hiace",
                year: 2022,
                category: "van" as const,
                fuel_type: "diesel" as const,
                transmission: "manual" as const,
                seating_capacity: 14,
                engine_size: "2.8L",
                fuel_efficiency: "12 km/l",
                safety_rating: 4
            }
        ];

        const insertedSpecs = await db.insert(vehicleSpecifications).values(specData).returning();
        console.log(`✅ Seeded ${insertedSpecs.length} vehicle specifications`);

        // ===== VEHICLES =====
        console.log("🚙 Seeding vehicles...");
        const vehicleData = [
            {
                license_plate: "KCA 001A",
                vin: "1HGBH41JXMN109186",
                color: "White",
                status: "available" as const,
                daily_rate: 3500.00,
                location_id: insertedLocations[0].location_id,
                specification_id: insertedSpecs[0].specification_id,
                owner_id: insertedUsers[4].user_id, // Owner user
                mileage: 15000,
                last_service_date: new Date('2024-01-15'),
                next_service_due: new Date('2024-07-15'),
                insurance_expiry: new Date('2024-12-31'),
                registration_expiry: new Date('2024-11-30')
            },
            {
                license_plate: "KCA 002B",
                vin: "1HGBH41JXMN109187",
                color: "Silver",
                status: "available" as const,
                daily_rate: 4000.00,
                location_id: insertedLocations[1].location_id,
                specification_id: insertedSpecs[1].specification_id,
                owner_id: insertedUsers[4].user_id,
                mileage: 8000,
                last_service_date: new Date('2024-02-01'),
                next_service_due: new Date('2024-08-01'),
                insurance_expiry: new Date('2024-12-31'),
                registration_expiry: new Date('2024-10-31')
            },
            {
                license_plate: "KCA 003C",
                vin: "1HGBH41JXMN109188",
                color: "Black",
                status: "available" as const,
                daily_rate: 8500.00,
                location_id: insertedLocations[0].location_id,
                specification_id: insertedSpecs[2].specification_id,
                owner_id: insertedUsers[4].user_id,
                mileage: 12000,
                last_service_date: new Date('2024-01-20'),
                next_service_due: new Date('2024-07-20'),
                insurance_expiry: new Date('2024-12-31'),
                registration_expiry: new Date('2024-09-30')
            },
            {
                license_plate: "KCA 004D",
                vin: "1HGBH41JXMN109189",
                color: "White",
                status: "available" as const,
                daily_rate: 6500.00,
                location_id: insertedLocations[2].location_id,
                specification_id: insertedSpecs[3].specification_id,
                owner_id: insertedUsers[4].user_id,
                mileage: 25000,
                last_service_date: new Date('2024-01-10'),
                next_service_due: new Date('2024-07-10'),
                insurance_expiry: new Date('2024-12-31'),
                registration_expiry: new Date('2024-08-31')
            }
        ];

        const insertedVehicles = await db.insert(vehicles).values(vehicleData).returning();
        console.log(`✅ Seeded ${insertedVehicles.length} vehicles`);

        // ===== BOOKINGS =====
        console.log("📅 Seeding bookings...");
        const bookingData = [
            {
                user_id: insertedUsers[1].user_id, // John Customer
                vehicle_id: insertedVehicles[0].vehicle_id,
                pickup_location_id: insertedLocations[0].location_id,
                dropoff_location_id: insertedLocations[0].location_id,
                pickup_date: new Date('2024-03-01'),
                dropoff_date: new Date('2024-03-05'),
                total_amount: 14000.00,
                status: "completed" as const,
                booking_type: "standard" as const
            },
            {
                user_id: insertedUsers[1].user_id,
                vehicle_id: insertedVehicles[1].vehicle_id,
                pickup_location_id: insertedLocations[1].location_id,
                dropoff_location_id: insertedLocations[1].location_id,
                pickup_date: new Date('2024-04-15'),
                dropoff_date: new Date('2024-04-18'),
                total_amount: 12000.00,
                status: "confirmed" as const,
                booking_type: "standard" as const
            }
        ];

        const insertedBookings = await db.insert(bookings).values(bookingData).returning();
        console.log(`✅ Seeded ${insertedBookings.length} bookings`);

        // ===== PAYMENTS =====
        console.log("💳 Seeding payments...");
        const paymentData = [
            {
                booking_id: insertedBookings[0].booking_id,
                user_id: insertedUsers[1].user_id,
                amount: 14000.00,
                payment_method: "mpesa" as const,
                transaction_id: "MP240301001",
                status: "completed" as const,
                payment_date: new Date('2024-02-28')
            },
            {
                booking_id: insertedBookings[1].booking_id,
                user_id: insertedUsers[1].user_id,
                amount: 12000.00,
                payment_method: "card" as const,
                transaction_id: "CD240415001",
                status: "completed" as const,
                payment_date: new Date('2024-04-14')
            }
        ];

        const insertedPayments = await db.insert(payments).values(paymentData).returning();
        console.log(`✅ Seeded ${insertedPayments.length} payments`);

        // ===== SUPPORT TICKETS =====
        console.log("🎫 Seeding support tickets...");
        const ticketData = [
            {
                user_id: insertedUsers[1].user_id,
                subject: "Vehicle AC not working",
                description: "The air conditioning in my rental car is not functioning properly. Please assist.",
                category: "vehicle" as const,
                priority: "medium" as const,
                status: "open" as const
            },
            {
                user_id: insertedUsers[1].user_id,
                subject: "Booking modification request",
                description: "I need to extend my rental period by 2 days. Please help me modify my booking.",
                category: "booking" as const,
                priority: "low" as const,
                status: "in_progress" as const,
                assigned_to: insertedUsers[3].user_id // Support agent
            }
        ];

        const insertedTickets = await db.insert(supportTickets).values(ticketData).returning();
        console.log(`✅ Seeded ${insertedTickets.length} support tickets`);

        // ===== MAINTENANCE RECORDS =====
        console.log("🔧 Seeding maintenance records...");
        const maintenanceData = [
            {
                vehicle_id: insertedVehicles[0].vehicle_id,
                maintenance_type: "scheduled" as const,
                description: "Regular service and oil change",
                cost: 2500.00,
                maintenance_date: new Date('2024-01-15'),
                performed_by: "AutoCare Services",
                status: "completed" as const,
                next_maintenance_date: new Date('2024-07-15')
            },
            {
                vehicle_id: insertedVehicles[1].vehicle_id,
                maintenance_type: "repair" as const,
                description: "Brake pad replacement",
                cost: 3500.00,
                maintenance_date: new Date('2024-02-01'),
                performed_by: "Quick Fix Garage",
                status: "completed" as const
            }
        ];

        const insertedMaintenance = await db.insert(maintenanceRecords).values(maintenanceData).returning();
        console.log(`✅ Seeded ${insertedMaintenance.length} maintenance records`);

        console.log("\n🎉 Production seeding completed successfully!");
        console.log("📊 Summary:");
        console.log(`   - ${insertedLocations.length} locations`);
        console.log(`   - ${insertedUsers.length} users`);
        console.log(`   - ${insertedSpecs.length} vehicle specifications`);
        console.log(`   - ${insertedVehicles.length} vehicles`);
        console.log(`   - ${insertedBookings.length} bookings`);
        console.log(`   - ${insertedPayments.length} payments`);
        console.log(`   - ${insertedTickets.length} support tickets`);
        console.log(`   - ${insertedMaintenance.length} maintenance records`);

        console.log("\n🔐 Test Credentials:");
        console.log("   Admin: admin@okaycarrental.com / password123");
        console.log("   Customer: john@example.com / password123");
        console.log("   Support: support@okaycarrental.com / password123");

    } catch (error) {
        console.error("❌ Error during seeding:", error);
        throw error;
    }
}

// Run the seed function
if (require.main === module) {
    productionSeed()
        .then(() => {
            console.log("✅ Seeding completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Seeding failed:", error);
            process.exit(1);
        });
}

export default productionSeed;
