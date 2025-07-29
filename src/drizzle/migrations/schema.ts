import { pgTable, foreignKey, unique, uuid, numeric, boolean, varchar, timestamp, integer, text, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const bookingStatus = pgEnum("booking_status", ['pending', 'confirmed', 'active', 'completed', 'cancelled'])
export const fuelType = pgEnum("fuel_type", ['petrol', 'diesel', 'electric', 'hybrid'])
export const maintenanceType = pgEnum("maintenance_type", ['routine', 'repair', 'inspection', 'cleaning', 'emergency'])
export const paymentMethod = pgEnum("payment_method", ['stripe', 'mpesa', 'cash', 'bank_transfer'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'processing', 'completed', 'failed', 'refunded'])
export const ticketCategory = pgEnum("ticket_category", ['booking', 'payment', 'vehicle', 'technical', 'general'])
export const ticketPriority = pgEnum("ticket_priority", ['low', 'medium', 'high', 'urgent'])
export const ticketStatus = pgEnum("ticket_status", ['open', 'in_progress', 'resolved', 'closed'])
export const transmission = pgEnum("transmission", ['manual', 'automatic', 'cvt'])
export const userRole = pgEnum("user_role", ['user', 'admin', 'support_agent'])
export const vehicleCategory = pgEnum("vehicle_category", ['four_wheeler', 'two_wheeler'])
export const vehicleStatus = pgEnum("vehicle_status", ['available', 'rented', 'maintenance', 'out_of_service', 'reserved', 'damaged'])


export const vehicles = pgTable("vehicles", {
	vehicleId: uuid("vehicle_id").defaultRandom().primaryKey().notNull(),
	vehicleSpecId: uuid("vehicleSpec_id").notNull(),
	rentalRate: numeric("rental_rate", { precision: 10, scale:  2 }).notNull(),
	availability: boolean().default(true).notNull(),
	licensePlate: varchar("license_plate", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	locationId: uuid("location_id"),
	mileage: integer().default(0),
	lastServiceDate: timestamp("last_service_date", { mode: 'string' }),
	nextServiceDue: timestamp("next_service_due", { mode: 'string' }),
	insuranceExpiry: timestamp("insurance_expiry", { mode: 'string' }),
	registrationExpiry: timestamp("registration_expiry", { mode: 'string' }),
	notes: text(),
	fuelLevel: integer("fuel_level").default(100),
	lastCleaned: timestamp("last_cleaned", { mode: 'string' }),
	acquisitionDate: timestamp("acquisition_date", { mode: 'string' }),
	acquisitionCost: numeric("acquisition_cost", { precision: 12, scale:  2 }),
	depreciationRate: numeric("depreciation_rate", { precision: 5, scale:  2 }),
	conditionRating: integer("condition_rating").default(10),
	gpsTrackingId: varchar("gps_tracking_id", { length: 100 }),
	isDamaged: boolean("is_damaged").default(false),
	damageDescription: text("damage_description"),
	status: vehicleStatus().default('available').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleSpecId],
			foreignColumns: [vehicleSpecifications.vehicleSpecId],
			name: "vehicles_vehicleSpec_id_vehicle_specifications_vehicleSpec_id_f"
		}),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.locationId],
			name: "vehicles_location_id_locations_location_id_fk"
		}),
	unique("vehicles_license_plate_unique").on(table.licensePlate),
]);

export const locations = pgTable("locations", {
	locationId: uuid("location_id").defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 150 }).notNull(),
	address: text().notNull(),
	contactPhone: varchar("contact_phone", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const vehicleSpecifications = pgTable("vehicle_specifications", {
	vehicleSpecId: uuid("vehicleSpec_id").defaultRandom().primaryKey().notNull(),
	manufacturer: varchar({ length: 100 }).notNull(),
	model: varchar({ length: 100 }).notNull(),
	year: integer().notNull(),
	engineCapacity: varchar("engine_capacity", { length: 50 }),
	seatingCapacity: integer("seating_capacity").notNull(),
	color: varchar({ length: 50 }),
	features: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
	paymentId: uuid("payment_id").defaultRandom().primaryKey().notNull(),
	bookingId: uuid("booking_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	paymentDate: timestamp("payment_date", { mode: 'string' }),
	transactionId: varchar("transaction_id", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	failureReason: text("failure_reason"),
	metadata: text(),
	userId: uuid("user_id").notNull(),
	currency: varchar({ length: 3 }).default('USD').notNull(),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	mpesaReceiptNumber: varchar("mpesa_receipt_number", { length: 255 }),
	paymentMethod: paymentMethod("payment_method").default('cash').notNull(),
	paymentStatus: paymentStatus("payment_status").default('pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.bookingId],
			name: "payments_booking_id_bookings_booking_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "payments_user_id_users_user_id_fk"
		}),
]);

export const bookings = pgTable("bookings", {
	bookingId: uuid("booking_id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	vehicleId: uuid("vehicle_id").notNull(),
	locationId: uuid("location_id").notNull(),
	bookingDate: timestamp("booking_date", { mode: 'string' }).notNull(),
	returnDate: timestamp("return_date", { mode: 'string' }).notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	bookingStatus: bookingStatus("booking_status").default('pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "bookings_user_id_users_user_id_fk"
		}),
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "bookings_vehicle_id_vehicles_vehicle_id_fk"
		}),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.locationId],
			name: "bookings_location_id_locations_location_id_fk"
		}),
]);

export const users = pgTable("users", {
	userId: uuid("user_id").defaultRandom().primaryKey().notNull(),
	firstname: varchar({ length: 100 }).notNull(),
	lastname: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	contactPhone: varchar("contact_phone", { length: 20 }),
	address: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	role: userRole().default('user').notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const supportTickets = pgTable("support_tickets", {
	ticketId: uuid("ticket_id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	subject: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	assignedTo: uuid("assigned_to"),
	adminNotes: text("admin_notes"),
	resolution: text(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	status: ticketStatus().default('open').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "support_tickets_user_id_users_user_id_fk"
		}),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.userId],
			name: "support_tickets_assigned_to_users_user_id_fk"
		}),
]);

export const vehicleImages = pgTable("vehicle_images", {
	imageId: uuid("image_id").defaultRandom().primaryKey().notNull(),
	vehicleId: uuid("vehicle_id").notNull(),
	url: varchar({ length: 500 }).notNull(),
	alt: varchar({ length: 255 }),
	caption: text(),
	isPrimary: boolean("is_primary").default(false),
	is360: boolean("is_360").default(false),
	displayOrder: integer("display_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "vehicle_images_vehicle_id_vehicles_vehicle_id_fk"
		}),
]);

export const maintenanceRecords = pgTable("maintenance_records", {
	maintenanceId: uuid("maintenance_id").defaultRandom().primaryKey().notNull(),
	vehicleId: uuid("vehicle_id").notNull(),
	maintenanceDate: timestamp("maintenance_date", { mode: 'string' }).notNull(),
	description: text().notNull(),
	cost: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	serviceProvider: varchar("service_provider", { length: 200 }),
	technicianName: varchar("technician_name", { length: 100 }),
	partsReplaced: text("parts_replaced"),
	mileageAtService: integer("mileage_at_service"),
	nextServiceMileage: integer("next_service_mileage"),
	completionStatus: varchar("completion_status", { length: 50 }).default('completed'),
	warrantyInfo: text("warranty_info"),
	attachments: text().array(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.vehicleId],
			name: "maintenance_records_vehicle_id_vehicles_vehicle_id_fk"
		}),
]);
