import { relations } from "drizzle-orm/relations";
import { vehicleSpecifications, vehicles, locations, bookings, payments, users, supportTickets, vehicleImages, maintenanceRecords } from "./schema";

export const vehiclesRelations = relations(vehicles, ({one, many}) => ({
	vehicleSpecification: one(vehicleSpecifications, {
		fields: [vehicles.vehicleSpecId],
		references: [vehicleSpecifications.vehicleSpecId]
	}),
	location: one(locations, {
		fields: [vehicles.locationId],
		references: [locations.locationId]
	}),
	bookings: many(bookings),
	vehicleImages: many(vehicleImages),
	maintenanceRecords: many(maintenanceRecords),
}));

export const vehicleSpecificationsRelations = relations(vehicleSpecifications, ({many}) => ({
	vehicles: many(vehicles),
}));

export const locationsRelations = relations(locations, ({many}) => ({
	vehicles: many(vehicles),
	bookings: many(bookings),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	booking: one(bookings, {
		fields: [payments.bookingId],
		references: [bookings.bookingId]
	}),
	user: one(users, {
		fields: [payments.userId],
		references: [users.userId]
	}),
}));

export const bookingsRelations = relations(bookings, ({one, many}) => ({
	payments: many(payments),
	user: one(users, {
		fields: [bookings.userId],
		references: [users.userId]
	}),
	vehicle: one(vehicles, {
		fields: [bookings.vehicleId],
		references: [vehicles.vehicleId]
	}),
	location: one(locations, {
		fields: [bookings.locationId],
		references: [locations.locationId]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	payments: many(payments),
	bookings: many(bookings),
	supportTickets_userId: many(supportTickets, {
		relationName: "supportTickets_userId_users_userId"
	}),
	supportTickets_assignedTo: many(supportTickets, {
		relationName: "supportTickets_assignedTo_users_userId"
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one}) => ({
	user_userId: one(users, {
		fields: [supportTickets.userId],
		references: [users.userId],
		relationName: "supportTickets_userId_users_userId"
	}),
	user_assignedTo: one(users, {
		fields: [supportTickets.assignedTo],
		references: [users.userId],
		relationName: "supportTickets_assignedTo_users_userId"
	}),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [vehicleImages.vehicleId],
		references: [vehicles.vehicleId]
	}),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [maintenanceRecords.vehicleId],
		references: [vehicles.vehicleId]
	}),
}));