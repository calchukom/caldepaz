import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { swaggerPaths } from './swagger-paths';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Vehicle Rental Management System API',
            version: '1.0.0',
            description: 'A comprehensive API for managing vehicle rentals, bookings, payments, and customer support',
            contact: {
                name: 'Caleb Ogeto - Vehicle Rental Support',
                email: 'calebogeto01@gmail.com',
                url: 'mailto:calebogeto01@gmail.com'
            }
        },
        servers: [
            {
                url: 'https://okaycaleb.onrender.com/api',
                description: 'Production server (Render)',
            },
            {
                url: 'http://localhost:7000/api',
                description: 'Development server',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'string' },
                        firstname: { type: 'string' },
                        lastname: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        contact_phone: { type: 'string' },
                        address: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'admin'] },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                Vehicle: {
                    type: 'object',
                    properties: {
                        vehicle_id: { type: 'string' },
                        vehicleSpec_id: { type: 'string' },
                        rental_rate: { type: 'number' },
                        availability: { type: 'boolean' },
                        status: { type: 'string', enum: ['available', 'rented', 'maintenance', 'out_of_service', 'reserved'] },
                        license_plate: { type: 'string' },
                        location_id: { type: 'string' },
                        mileage: { type: 'integer' },
                        fuel_level: { type: 'integer' },
                        condition_rating: { type: 'integer' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                VehicleSpecification: {
                    type: 'object',
                    properties: {
                        vehicleSpec_id: { type: 'string' },
                        manufacturer: { type: 'string' },
                        model: { type: 'string' },
                        year: { type: 'integer' },
                        fuel_type: { type: 'string' },
                        engine_capacity: { type: 'string' },
                        transmission: { type: 'string' },
                        seating_capacity: { type: 'integer' },
                        color: { type: 'string' },
                        features: { type: 'string' },
                        vehicle_category: { type: 'string' }
                    }
                },
                Booking: {
                    type: 'object',
                    properties: {
                        booking_id: { type: 'string' },
                        user_id: { type: 'string' },
                        vehicle_id: { type: 'string' },
                        location_id: { type: 'string' },
                        booking_date: { type: 'string', format: 'date' },
                        return_date: { type: 'string', format: 'date' },
                        total_amount: { type: 'number' },
                        booking_status: { type: 'string', enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'] },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        payment_id: { type: 'string' },
                        booking_id: { type: 'string' },
                        amount: { type: 'number' },
                        payment_status: { type: 'string', enum: ['Pending', 'Completed', 'Failed'] },
                        payment_date: { type: 'string', format: 'date-time' },
                        payment_method: { type: 'string' },
                        transaction_id: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                SupportTicket: {
                    type: 'object',
                    properties: {
                        ticket_id: { type: 'string' },
                        user_id: { type: 'string' },
                        subject: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                Location: {
                    type: 'object',
                    properties: {
                        location_id: { type: 'string' },
                        name: { type: 'string' },
                        address: { type: 'string' },
                        contact_phone: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                VehicleImage: {
                    type: 'object',
                    properties: {
                        image_id: { type: 'string', format: 'uuid' },
                        vehicle_id: { type: 'string', format: 'uuid' },
                        url: { type: 'string', format: 'uri' },
                        cloudinary_public_id: { type: 'string', nullable: true },
                        alt: { type: 'string', nullable: true },
                        caption: { type: 'string', nullable: true },
                        is_primary: { type: 'boolean' },
                        is_360: { type: 'boolean' },
                        display_order: { type: 'integer' },
                        file_size: { type: 'integer', nullable: true },
                        mime_type: { type: 'string', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        optimized_urls: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                thumbnail: { type: 'string', format: 'uri' },
                                medium: { type: 'string', format: 'uri' },
                                large: { type: 'string', format: 'uri' },
                                original: { type: 'string', format: 'uri' }
                            }
                        }
                    }
                },
                CreateVehicleImageRequest: {
                    type: 'object',
                    required: ['url'],
                    properties: {
                        url: { type: 'string', format: 'uri' },
                        cloudinary_public_id: { type: 'string' },
                        alt: { type: 'string' },
                        caption: { type: 'string' },
                        is_primary: { type: 'boolean', default: false },
                        is_360: { type: 'boolean', default: false },
                        display_order: { type: 'integer', default: 0 },
                        file_size: { type: 'integer' },
                        mime_type: { type: 'string' }
                    }
                },
                UpdateVehicleImageRequest: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', format: 'uri' },
                        cloudinary_public_id: { type: 'string' },
                        alt: { type: 'string' },
                        caption: { type: 'string' },
                        is_primary: { type: 'boolean' },
                        is_360: { type: 'boolean' },
                        display_order: { type: 'integer' },
                        file_size: { type: 'integer' },
                        mime_type: { type: 'string' }
                    }
                },
                ReorderImagesRequest: {
                    type: 'object',
                    required: ['imageOrders'],
                    properties: {
                        imageOrders: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['imageId', 'order'],
                                properties: {
                                    imageId: { type: 'string', format: 'uuid' },
                                    order: { type: 'integer' }
                                }
                            }
                        }
                    }
                },
                MaintenanceRecord: {
                    type: 'object',
                    properties: {
                        maintenance_id: { type: 'string' },
                        vehicle_id: { type: 'string' },
                        maintenance_type: {
                            type: 'string',
                            enum: ['routine', 'repair', 'inspection', 'emergency', 'recall', 'upgrade']
                        },
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        maintenance_date: { type: 'string', format: 'date-time' },
                        scheduled_date: { type: 'string', format: 'date-time', nullable: true },
                        completion_date: { type: 'string', format: 'date-time', nullable: true },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue']
                        },
                        cost: { type: 'string', nullable: true },
                        service_provider: { type: 'string', nullable: true },
                        technician_name: { type: 'string', nullable: true },
                        parts_replaced: { type: 'string', nullable: true },
                        mileage_at_service: { type: 'integer', nullable: true },
                        next_service_mileage: { type: 'integer', nullable: true },
                        notes: { type: 'string', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                CreateMaintenanceRequest: {
                    type: 'object',
                    required: ['vehicle_id', 'maintenance_type', 'title', 'maintenance_date', 'status'],
                    properties: {
                        vehicle_id: { type: 'string' },
                        maintenance_type: {
                            type: 'string',
                            enum: ['routine', 'repair', 'inspection', 'emergency', 'recall', 'upgrade']
                        },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        maintenance_date: { type: 'string', format: 'date-time' },
                        scheduled_date: { type: 'string', format: 'date-time' },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue']
                        },
                        cost: { type: 'string' },
                        service_provider: { type: 'string' },
                        technician_name: { type: 'string' },
                        parts_replaced: { type: 'string' },
                        mileage_at_service: { type: 'integer' },
                        next_service_mileage: { type: 'integer' },
                        notes: { type: 'string' }
                    }
                },
                UpdateMaintenanceRequest: {
                    type: 'object',
                    properties: {
                        maintenance_type: {
                            type: 'string',
                            enum: ['routine', 'repair', 'inspection', 'emergency', 'recall', 'upgrade']
                        },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        maintenance_date: { type: 'string', format: 'date-time' },
                        scheduled_date: { type: 'string', format: 'date-time' },
                        completion_date: { type: 'string', format: 'date-time' },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue']
                        },
                        cost: { type: 'string' },
                        service_provider: { type: 'string' },
                        technician_name: { type: 'string' },
                        parts_replaced: { type: 'string' },
                        mileage_at_service: { type: 'integer' },
                        next_service_mileage: { type: 'integer' },
                        notes: { type: 'string' }
                    }
                },
                MaintenanceStatistics: {
                    type: 'object',
                    properties: {
                        total_maintenance_cost: { type: 'number' },
                        total_records: { type: 'integer' },
                        average_cost: { type: 'number' },
                        completed_count: { type: 'integer' },
                        pending_count: { type: 'integer' },
                        in_progress_count: { type: 'integer' },
                        overdue_count: { type: 'integer' },
                        detailed: {
                            type: 'object',
                            properties: {
                                period: {
                                    type: 'object',
                                    properties: {
                                        start_date: { type: 'string', format: 'date-time' },
                                        end_date: { type: 'string', format: 'date-time' }
                                    }
                                },
                                summary: {
                                    type: 'object',
                                    properties: {
                                        total_records: { type: 'integer' },
                                        total_cost: { type: 'number' },
                                        average_cost: { type: 'number' },
                                        by_type: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    maintenance_type: { type: 'string' },
                                                    count: { type: 'integer' },
                                                    total_cost: { type: 'number' },
                                                    average_cost: { type: 'number' }
                                                }
                                            }
                                        },
                                        by_month: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    month: { type: 'string' },
                                                    count: { type: 'integer' },
                                                    total_cost: { type: 'number' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                ChatMessage: {
                    type: 'object',
                    properties: {
                        message_id: { type: 'string', format: 'uuid', description: 'Unique message identifier' },
                        ticket_id: { type: 'string', format: 'uuid', description: 'Support ticket ID this message belongs to' },
                        sender_id: { type: 'string', format: 'uuid', description: 'ID of user who sent the message' },
                        user_id: { type: 'string', format: 'uuid', description: 'ID of user who can read this message' },
                        message: { type: 'string', description: 'The message content' },
                        message_type: {
                            type: 'string',
                            enum: ['text', 'image', 'file'],
                            default: 'text',
                            description: 'Type of message content'
                        },
                        attachment_url: { type: 'string', format: 'uri', nullable: true, description: 'URL for file attachments' },
                        is_read: { type: 'boolean', default: false, description: 'Whether the message has been read' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        sender_name: { type: 'string', description: 'Full name of the message sender' },
                        sender_role: {
                            type: 'string',
                            enum: ['admin', 'support_agent', 'user'],
                            description: 'Role of the message sender'
                        },
                        sender_avatar: { type: 'string', format: 'uri', nullable: true, description: 'Avatar URL of the sender' }
                    },
                    required: ['message_id', 'ticket_id', 'sender_id', 'message', 'message_type', 'is_read', 'created_at', 'sender_name', 'sender_role']
                },
                SendMessageRequest: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 2000,
                            description: 'The message content to send'
                        },
                        message_type: {
                            type: 'string',
                            enum: ['text', 'image', 'file'],
                            default: 'text',
                            description: 'Type of message content'
                        },
                        attachment_url: {
                            type: 'string',
                            format: 'uri',
                            description: 'URL for file attachments (required if message_type is image or file)'
                        }
                    }
                },
                ChatStatistics: {
                    type: 'object',
                    properties: {
                        total_messages: { type: 'integer', description: 'Total number of messages in the chat' },
                        unread_messages: { type: 'integer', description: 'Number of unread messages for the current user' },
                        last_message_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            description: 'Timestamp of the last message in the chat'
                        },
                        participants: {
                            type: 'array',
                            description: 'List of users who have participated in this chat',
                            items: {
                                type: 'object',
                                properties: {
                                    user_id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string', description: 'Full name of the participant' },
                                    role: {
                                        type: 'string',
                                        enum: ['admin', 'support_agent', 'user'],
                                        description: 'Role of the participant'
                                    },
                                    avatar: { type: 'string', format: 'uri', nullable: true, description: 'Avatar URL of the participant' }
                                }
                            }
                        }
                    },
                    required: ['total_messages', 'unread_messages', 'participants']
                },
                ActiveChat: {
                    type: 'object',
                    properties: {
                        ticket_id: { type: 'string', format: 'uuid', description: 'Support ticket ID' },
                        ticket_subject: { type: 'string', description: 'Subject of the support ticket' },
                        ticket_status: {
                            type: 'string',
                            enum: ['open', 'in_progress', 'resolved', 'closed'],
                            description: 'Current status of the ticket'
                        },
                        priority: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'urgent'],
                            description: 'Priority level of the ticket'
                        },
                        last_message: { type: 'string', nullable: true, description: 'Content of the last message' },
                        last_message_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            description: 'Timestamp of the last message'
                        },
                        unread_count: { type: 'integer', description: 'Number of unread messages in this chat' },
                        customer_name: { type: 'string', description: 'Name of the customer who created the ticket' },
                        customer_avatar: { type: 'string', format: 'uri', nullable: true, description: 'Avatar URL of the customer' },
                        assigned_agent: { type: 'string', nullable: true, description: 'Name of the assigned support agent' },
                        assigned_agent_avatar: { type: 'string', format: 'uri', nullable: true, description: 'Avatar URL of the assigned agent' }
                    },
                    required: ['ticket_id', 'ticket_subject', 'ticket_status', 'priority', 'unread_count', 'customer_name']
                },
                PaginationInfo: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', description: 'Current page number' },
                        limit: { type: 'integer', description: 'Number of items per page' },
                        total: { type: 'integer', description: 'Total number of items' },
                        total_pages: { type: 'integer', description: 'Total number of pages' }
                    },
                    required: ['page', 'limit', 'total', 'total_pages']
                },
                ChatMessagesResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                messages: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/ChatMessage' }
                                },
                                pagination: { $ref: '#/components/schemas/PaginationInfo' }
                            },
                            required: ['messages', 'pagination']
                        },
                        message: { type: 'string' }
                    },
                    required: ['success', 'data', 'message']
                },
                SendMessageResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { $ref: '#/components/schemas/ChatMessage' },
                        message: { type: 'string' }
                    },
                    required: ['success', 'data', 'message']
                },
                MarkAsReadResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                messages_marked_as_read: { type: 'integer', description: 'Number of messages marked as read' }
                            },
                            required: ['messages_marked_as_read']
                        },
                        message: { type: 'string' }
                    },
                    required: ['success', 'data', 'message']
                },
                ChatStatisticsResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { $ref: '#/components/schemas/ChatStatistics' },
                        message: { type: 'string' }
                    },
                    required: ['success', 'data', 'message']
                },
                ActiveChatsResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                chats: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/ActiveChat' }
                                },
                                pagination: { $ref: '#/components/schemas/PaginationInfo' }
                            },
                            required: ['chats', 'pagination']
                        },
                        message: { type: 'string' }
                    },
                    required: ['success', 'data', 'message']
                },
                TypingIndicatorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                    },
                    required: ['success', 'message']
                }
            }
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization'
            },
            {
                name: 'Users',
                description: 'User management operations'
            },
            {
                name: 'Vehicles',
                description: 'Vehicle and vehicle specification management'
            },
            {
                name: 'VehicleImages',
                description: 'Vehicle image management operations'
            },
            {
                name: 'Maintenance',
                description: 'Vehicle maintenance records and scheduling management'
            },
            {
                name: 'Bookings',
                description: 'Booking management operations'
            },
            {
                name: 'Payments',
                description: 'Payment processing and management'
            },
            {
                name: 'Support',
                description: 'Customer support ticket management'
            },
            {
                name: 'Chat',
                description: 'Real-time chat system for support tickets with WebSocket integration'
            },
            {
                name: 'Locations',
                description: 'Location and branch management'
            },
            {
                name: 'Admin',
                description: 'Administrative operations and reports'
            }
        ],
        // Import all paths from the separate file
        paths: swaggerPaths
    },
    apis: [
        './src/routes/*.ts',
        './src/routes/**/*.ts',
        './src/models/*.ts',
        './src/controllers/*.ts'
    ],
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Application): void => {
    // Serve Swagger UI at multiple paths for convenience
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Vehicle Rental API Documentation'
    }));

    // Also serve at /api/docs/ for convenience
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Vehicle Rental API Documentation'
    }));

    // Serve swagger.json
    app.get('/swagger.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });

    console.log('��� Swagger documentation available at:');
    console.log('   • http://localhost:7000/api-docs');
    console.log('   • http://localhost:7000/api/docs');
    console.log('   • http://localhost:7000/swagger.json (JSON spec)');
};

export default specs;
