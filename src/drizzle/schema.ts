import { pgTable, varchar, integer, decimal, boolean, timestamp, text, pgEnum, uuid, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// ENUMS
// =============================================================================

// Updated Vehicle Status Enum - Added 'damaged' for frontend compatibility
export const vehicleStatusEnum = pgEnum('vehicle_status', [
    'available',
    'rented',
    'maintenance',
    'out_of_service',
    'reserved',
    'damaged'  // ✅ ADDED for frontend compatibility
]);

// Updated Booking Status Enum - Added 'active' for frontend compatibility
export const bookingStatusEnum = pgEnum('booking_status', [
    'pending',
    'confirmed',
    'active',      // ✅ ADDED for frontend compatibility
    'completed',
    'cancelled'
]);

// Updated Payment Status Enum - Added 'processing' for frontend compatibility
export const paymentStatusEnum = pgEnum('payment_status', [
    'pending',
    'processing',  // ✅ ADDED for frontend compatibility
    'completed',
    'failed',
    'refunded'
]);

// New Payment Method Enum - Structured payment methods
export const paymentMethodEnum = pgEnum('payment_method', [
    'stripe',
    'mpesa',
    'cash',
    'bank_transfer',
    'credit_card'
]);

// Existing Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'support_agent']);
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent']);
export const ticketCategoryEnum = pgEnum('ticket_category', ['booking', 'payment', 'vehicle', 'technical', 'general']);
export const transmissionEnum = pgEnum('transmission', ['manual', 'automatic', 'cvt']);
export const fuelTypeEnum = pgEnum('fuel_type', ['petrol', 'diesel', 'electric', 'hybrid']);
export const vehicleCategoryEnum = pgEnum('vehicle_category', ['four_wheeler', 'two_wheeler', 'commercial']);
export const maintenanceTypeEnum = pgEnum('maintenance_type', ['routine', 'repair', 'inspection', 'upgrade', 'emergency', 'cleaning']);
export const maintenanceStatusEnum = pgEnum('maintenance_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);

// =============================================================================
// TABLES
// =============================================================================

// Users Table
export const users = pgTable('users', {
    user_id: uuid('user_id').primaryKey().defaultRandom(),
    firstname: varchar('firstname', { length: 100 }).notNull(),
    lastname: varchar('lastname', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    contact_phone: varchar('contact_phone', { length: 20 }),
    address: text('address'),
    role: userRoleEnum('role').default('user').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Vehicle Specifications Table
export const vehicleSpecifications = pgTable('vehicle_specifications', {
    vehicleSpec_id: uuid('vehicleSpec_id').primaryKey().defaultRandom(),
    manufacturer: varchar('manufacturer', { length: 100 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    year: integer('year').notNull(),
    fuel_type: fuelTypeEnum('fuel_type').notNull(),
    engine_capacity: varchar('engine_capacity', { length: 50 }),
    transmission: transmissionEnum('transmission').notNull(),
    seating_capacity: integer('seating_capacity').notNull(),
    color: varchar('color', { length: 50 }),
    features: text('features'), // JSON string or comma-separated features
    vehicle_category: vehicleCategoryEnum('vehicle_category').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Locations Table
export const locations = pgTable('locations', {
    location_id: uuid('location_id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 150 }).notNull(),
    address: text('address').notNull(),
    contact_phone: varchar('contact_phone', { length: 20 }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Enhanced Vehicles Table
export const vehicles = pgTable('vehicles', {
    vehicle_id: uuid('vehicle_id').primaryKey().defaultRandom(),
    vehicleSpec_id: uuid('vehicleSpec_id').references(() => vehicleSpecifications.vehicleSpec_id).notNull(),
    location_id: uuid('location_id').references(() => locations.location_id),
    rental_rate: decimal('rental_rate', { precision: 10, scale: 2 }).notNull(),
    availability: boolean('availability').default(true).notNull(),
    status: vehicleStatusEnum('status').default('available').notNull(), // ✅ UPDATED enum
    license_plate: varchar('license_plate', { length: 20 }).unique(),
    mileage: integer('mileage').default(0),
    fuel_level: integer('fuel_level').default(100),
    last_service_date: timestamp('last_service_date'),
    next_service_due: timestamp('next_service_due'),
    last_cleaned: timestamp('last_cleaned'),
    insurance_expiry: timestamp('insurance_expiry'),
    registration_expiry: timestamp('registration_expiry'),
    acquisition_date: timestamp('acquisition_date'),
    acquisition_cost: decimal('acquisition_cost', { precision: 12, scale: 2 }),
    depreciation_rate: decimal('depreciation_rate', { precision: 5, scale: 2 }),
    condition_rating: integer('condition_rating').default(10),
    gps_tracking_id: varchar('gps_tracking_id', { length: 100 }),
    is_damaged: boolean('is_damaged').default(false),
    damage_description: text('damage_description'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

//  NEW: Vehicle Images Table
export const vehicleImages = pgTable('vehicle_images', {
    image_id: uuid('image_id').primaryKey().defaultRandom(),
    vehicle_id: uuid('vehicle_id').references(() => vehicles.vehicle_id).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    cloudinary_public_id: varchar('cloudinary_public_id', { length: 255 }), // Store Cloudinary public ID
    alt: varchar('alt', { length: 255 }),
    caption: text('caption'),
    is_primary: boolean('is_primary').default(false),
    is_360: boolean('is_360').default(false),
    display_order: integer('display_order').default(0),
    file_size: integer('file_size'), // Store file size in bytes
    mime_type: varchar('mime_type', { length: 100 }), // Store MIME type
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Enhanced Bookings Table
export const bookings = pgTable('bookings', {
    booking_id: uuid('booking_id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.user_id).notNull(),
    vehicle_id: uuid('vehicle_id').references(() => vehicles.vehicle_id).notNull(),
    location_id: uuid('location_id').references(() => locations.location_id).notNull(),
    booking_date: timestamp('booking_date').notNull(),
    return_date: timestamp('return_date').notNull(),
    total_amount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    booking_status: bookingStatusEnum('booking_status').default('pending').notNull(), // ✅ UPDATED enum
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Enhanced Payments Table
export const payments = pgTable('payments', {
    payment_id: uuid('payment_id').primaryKey().defaultRandom(),
    booking_id: uuid('booking_id').references(() => bookings.booking_id).notNull(),
    user_id: uuid('user_id').references(() => users.user_id).notNull(), // ✅ ADDED for frontend compatibility
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(), // ✅ ADDED for frontend compatibility
    payment_status: paymentStatusEnum('payment_status').default('pending').notNull(), // ✅ UPDATED enum
    payment_method: paymentMethodEnum('payment_method').notNull(), // ✅ UPDATED to use enum
    payment_date: timestamp('payment_date'),
    transaction_id: varchar('transaction_id', { length: 255 }),
    stripe_payment_intent_id: varchar('stripe_payment_intent_id', { length: 255 }), // ✅ ADDED for Stripe integration
    mpesa_receipt_number: varchar('mpesa_receipt_number', { length: 255 }), // ✅ ADDED for M-Pesa integration
    failure_reason: text('failure_reason'),
    metadata: text('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customer Support Tickets Table
export const supportTickets = pgTable('support_tickets', {
    ticket_id: uuid('ticket_id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.user_id).notNull(),
    subject: varchar('subject', { length: 200 }).notNull(),
    description: text('description').notNull(),
    status: ticketStatusEnum('status').default('open').notNull(),
    priority: ticketPriorityEnum('priority').default('medium').notNull(),
    category: ticketCategoryEnum('category').default('general').notNull(),
    assigned_to: uuid('assigned_to').references(() => users.user_id),
    admin_notes: text('admin_notes'),
    resolution: text('resolution'),
    resolved_at: timestamp('resolved_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Chat Messages Table (for real-time chat in support tickets)
export const chatMessages = pgTable('chat_messages', {
    message_id: uuid('message_id').primaryKey().defaultRandom(),
    ticket_id: uuid('ticket_id').references(() => supportTickets.ticket_id).notNull(),
    sender_id: uuid('sender_id').references(() => users.user_id).notNull(),
    sender_role: userRoleEnum('sender_role').notNull(),
    message: text('message').notNull(),
    message_type: varchar('message_type', { length: 20 }).default('text').notNull(), // text, image, file
    attachment_url: varchar('attachment_url', { length: 500 }),
    is_read: boolean('is_read').default(false).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Vehicle Maintenance Records Table
export const maintenanceRecords = pgTable('maintenance_records', {
    maintenance_id: uuid('maintenance_id').primaryKey().defaultRandom(),
    vehicle_id: uuid('vehicle_id').references(() => vehicles.vehicle_id).notNull(),
    maintenance_type: maintenanceTypeEnum('maintenance_type').default('routine').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    cost: decimal('cost', { precision: 10, scale: 2 }).default('0').notNull(),
    maintenance_date: timestamp('maintenance_date').notNull(),
    next_maintenance_date: timestamp('next_maintenance_date'),
    scheduled_date: timestamp('scheduled_date').notNull(),
    completed_date: timestamp('completed_date'),
    status: maintenanceStatusEnum('status').default('scheduled').notNull(), // scheduled, in_progress, completed, cancelled
    service_provider: varchar('service_provider', { length: 255 }),
    technician_name: varchar('technician_name', { length: 255 }),
    location: varchar('location', { length: 255 }),
    odometer: integer('odometer'),
    mileage_at_service: integer('mileage_at_service'),
    next_service_mileage: integer('next_service_mileage'),
    parts_replaced: text('parts_replaced'),
    labor_hours: decimal('labor_hours', { precision: 5, scale: 2 }),
    warranty_end_date: timestamp('warranty_end_date'),
    warranty_info: text('warranty_info'),
    completion_status: varchar('completion_status', { length: 50 }),
    notes: text('notes'),
    attachments: text('attachments').array(),
    performed_by: varchar('performed_by', { length: 255 }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Vehicle Maintenance Schedule Table
export const maintenanceSchedules = pgTable('maintenance_schedules', {
    schedule_id: uuid('schedule_id').primaryKey().defaultRandom(),
    vehicle_id: uuid('vehicle_id').references(() => vehicles.vehicle_id).notNull(),
    maintenance_type: maintenanceTypeEnum('maintenance_type').notNull(),
    interval_type: varchar('interval_type', { length: 20 }).notNull(), // 'mileage', 'time', 'both'
    interval_value: integer('interval_value').notNull(), // miles or months
    interval_unit: varchar('interval_unit', { length: 10 }).notNull(), // 'miles', 'months', 'days'
    last_performed_date: timestamp('last_performed_date'),
    last_performed_mileage: integer('last_performed_mileage'),
    next_due_date: timestamp('next_due_date'),
    next_due_mileage: integer('next_due_mileage'),
    estimated_cost: decimal('estimated_cost', { precision: 10, scale: 2 }),
    priority: integer('priority').default(1), // 1=low, 2=medium, 3=high, 4=critical
    is_active: boolean('is_active').default(true),
    description: text('description'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
    bookings: many(bookings),
    payments: many(payments), // ✅ ADDED relation to payments
    supportTickets: many(supportTickets),
    chatMessages: many(chatMessages), // ✅ ADDED relation to chat messages
}));

export const vehicleSpecificationsRelations = relations(vehicleSpecifications, ({ many }) => ({
    vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
    vehicleSpecification: one(vehicleSpecifications, {
        fields: [vehicles.vehicleSpec_id],
        references: [vehicleSpecifications.vehicleSpec_id],
    }),
    location: one(locations, {
        fields: [vehicles.location_id],
        references: [locations.location_id],
    }),
    bookings: many(bookings),
    maintenanceRecords: many(maintenanceRecords),
    maintenanceSchedules: many(maintenanceSchedules), // ✅ ADDED relation to maintenance schedules
    images: many(vehicleImages), // ✅ ADDED relation to vehicle images
}));

// ✅ NEW: Vehicle Images Relations
export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
    vehicle: one(vehicles, {
        fields: [vehicleImages.vehicle_id],
        references: [vehicles.vehicle_id],
    }),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
    bookings: many(bookings),
    vehicles: many(vehicles), // ✅ ADDED relation to vehicles
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
    user: one(users, {
        fields: [bookings.user_id],
        references: [users.user_id],
    }),
    vehicle: one(vehicles, {
        fields: [bookings.vehicle_id],
        references: [vehicles.vehicle_id],
    }),
    location: one(locations, {
        fields: [bookings.location_id],
        references: [locations.location_id],
    }),
    payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
    booking: one(bookings, {
        fields: [payments.booking_id],
        references: [bookings.booking_id],
    }),
    user: one(users, { // ✅ ADDED relation to user
        fields: [payments.user_id],
        references: [users.user_id],
    }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
    user: one(users, {
        fields: [supportTickets.user_id],
        references: [users.user_id],
    }),
    assignedAgent: one(users, {
        fields: [supportTickets.assigned_to],
        references: [users.user_id],
    }),
    chatMessages: many(chatMessages), // ✅ ADDED relation to chat messages
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    ticket: one(supportTickets, {
        fields: [chatMessages.ticket_id],
        references: [supportTickets.ticket_id],
    }),
    sender: one(users, {
        fields: [chatMessages.sender_id],
        references: [users.user_id],
    }),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
    vehicle: one(vehicles, {
        fields: [maintenanceRecords.vehicle_id],
        references: [vehicles.vehicle_id],
    }),
}));

export const maintenanceSchedulesRelations = relations(maintenanceSchedules, ({ one }) => ({
    vehicle: one(vehicles, {
        fields: [maintenanceSchedules.vehicle_id],
        references: [vehicles.vehicle_id],
    }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type VehicleSpecification = typeof vehicleSpecifications.$inferSelect;
export type NewVehicleSpecification = typeof vehicleSpecifications.$inferInsert;

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;

export type VehicleImage = typeof vehicleImages.$inferSelect; // ✅ ADDED type export
export type NewVehicleImage = typeof vehicleImages.$inferInsert; // ✅ ADDED type export

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect; // ✅ ADDED type export
export type NewChatMessage = typeof chatMessages.$inferInsert; // ✅ ADDED type export

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type NewMaintenanceRecord = typeof maintenanceRecords.$inferInsert;

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type NewMaintenanceSchedule = typeof maintenanceSchedules.$inferInsert;

// =============================================================================
// ENUM TYPE EXPORTS FOR TYPESCRIPT
// =============================================================================

export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'out_of_service' | 'reserved' | 'damaged';
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'stripe' | 'mpesa' | 'cash' | 'bank_transfer';
export type UserRole = 'user' | 'admin' | 'support_agent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'booking' | 'payment' | 'vehicle' | 'technical' | 'general';
export type Transmission = 'manual' | 'automatic' | 'cvt';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';
export type VehicleCategory = 'four_wheeler' | 'two_wheeler';
export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'upgrade' | 'emergency' | 'cleaning';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';