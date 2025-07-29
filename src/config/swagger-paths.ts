// OpenAPI 3.0 Paths Definition for Vehicle Rental Management System API
// This file contains all the API endpoint definitions for Swagger documentation

export const swaggerPaths = {
    // ============= AUTHENTICATION ENDPOINTS =============
    '/auth/register': {
        post: {
            tags: ['Authentication'],
            summary: 'Register a new user',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['firstname', 'lastname', 'email', 'password'],
                            properties: {
                                firstname: { type: 'string', example: 'John' },
                                lastname: { type: 'string', example: 'Doe' },
                                email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
                                password: { type: 'string', example: 'SecurePass123!' },
                                contact_phone: { type: 'string', example: '+254712345678' },
                                address: { type: 'string', example: '123 Main Street, Nairobi' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'User registered successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: { $ref: '#/components/schemas/User' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/login': {
        post: {
            tags: ['Authentication'],
            summary: 'Login user',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email', 'password'],
                            properties: {
                                email: { type: 'string', format: 'email', example: 'calebogeto1@gmail.com' },
                                password: { type: 'string', example: 'calebogeto1' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Login successful',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            user: { $ref: '#/components/schemas/User' },
                                            accessToken: { type: 'string' },
                                            refreshToken: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/me': {
        get: {
            tags: ['Authentication'],
            summary: 'Get current user profile',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'User profile retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/User' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/refresh': {
        post: {
            tags: ['Authentication'],
            summary: 'Refresh access token',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['refreshToken'],
                            properties: {
                                refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Token refreshed successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            accessToken: { type: 'string' },
                                            refreshToken: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/logout': {
        post: {
            tags: ['Authentication'],
            summary: 'Logout user',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['refreshToken'],
                            properties: {
                                refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Logout successful',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/forgot-password': {
        post: {
            tags: ['Authentication'],
            summary: 'Request password reset',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email'],
                            properties: {
                                email: { type: 'string', format: 'email', example: 'user@example.com' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Password reset instructions sent',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/reset-password': {
        post: {
            tags: ['Authentication'],
            summary: 'Reset password using token',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['token', 'newPassword'],
                            properties: {
                                token: { type: 'string', example: 'reset_token_here' },
                                newPassword: { type: 'string', example: 'NewSecurePass123!' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Password reset successful',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/reset-password-with-code': {
        post: {
            tags: ['Authentication'],
            summary: 'Reset password using verification code',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email', 'resetCode', 'newPassword'],
                            properties: {
                                email: { type: 'string', format: 'email', example: 'user@example.com' },
                                resetCode: { type: 'string', example: '123456' },
                                newPassword: { type: 'string', example: 'NewSecurePass123!' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Password reset successful',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/change-password': {
        put: {
            tags: ['Authentication'],
            summary: 'Change user password',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['currentPassword', 'newPassword', 'confirmPassword'],
                            properties: {
                                currentPassword: { type: 'string', example: 'CurrentPass123!' },
                                newPassword: { type: 'string', example: 'NewSecurePass123!' },
                                confirmPassword: { type: 'string', example: 'NewSecurePass123!' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Password changed successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= INVITATION ENDPOINTS =============
    '/auth/invite': {
        post: {
            tags: ['Authentication'],
            summary: 'Send user invitation (Admin only)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email', 'role'],
                            properties: {
                                email: { type: 'string', format: 'email', example: 'user@example.com' },
                                role: { type: 'string', enum: ['user', 'admin'], example: 'user' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Invitation sent successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            inviteToken: { type: 'string' },
                                            email: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/invite/{inviteToken}': {
        get: {
            tags: ['Authentication'],
            summary: 'Get invitation details',
            parameters: [
                { name: 'inviteToken', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': {
                    description: 'Invitation details retrieved',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            email: { type: 'string' },
                                            role: { type: 'string' },
                                            expires_at: { type: 'string', format: 'date-time' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        delete: {
            tags: ['Authentication'],
            summary: 'Revoke invitation (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'inviteToken', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': {
                    description: 'Invitation revoked successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/auth/invite/accept': {
        post: {
            tags: ['Authentication'],
            summary: 'Accept invitation and create account',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['inviteToken', 'firstname', 'lastname', 'password'],
                            properties: {
                                inviteToken: { type: 'string', example: '123456' },
                                firstname: { type: 'string', example: 'John' },
                                lastname: { type: 'string', example: 'Doe' },
                                password: { type: 'string', example: 'SecurePass123!' },
                                contact_phone: { type: 'string', example: '+254712345678' },
                                address: { type: 'string', example: '123 Main Street, Nairobi' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Account created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            user: { $ref: '#/components/schemas/User' },
                                            accessToken: { type: 'string' },
                                            refreshToken: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= USER MANAGEMENT ENDPOINTS =============
    '/users/statistics': {
        get: {
            tags: ['Users'],
            summary: 'Get user statistics (Admin only)',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'User statistics retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            totalUsers: { type: 'integer' },
                                            activeUsers: { type: 'integer' },
                                            newUsersThisMonth: { type: 'integer' },
                                            usersByRole: {
                                                type: 'object',
                                                properties: {
                                                    admin: { type: 'integer' },
                                                    user: { type: 'integer' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/users/search': {
        get: {
            tags: ['Users'],
            summary: 'Search users (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query' },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Maximum results' }
            ],
            responses: {
                '200': {
                    description: 'Users found successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/User' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/users': {
        get: {
            tags: ['Users'],
            summary: 'Get all users (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'created_at' } },
                { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
            ],
            responses: {
                '200': {
                    description: 'Users retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                                            total: { type: 'integer' },
                                            page: { type: 'integer' },
                                            limit: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Users'],
            summary: 'Create new user (Admin only)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['firstname', 'lastname', 'email', 'password'],
                            properties: {
                                firstname: { type: 'string', example: 'Alice' },
                                lastname: { type: 'string', example: 'Johnson' },
                                email: { type: 'string', format: 'email', example: 'alice.johnson@example.com' },
                                password: { type: 'string', example: 'SecurePass123!' },
                                contact_phone: { type: 'string', example: '+254712345680' },
                                address: { type: 'string', example: '789 Garden Road, Nairobi' },
                                role: { type: 'string', enum: ['user', 'admin'], default: 'user' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'User created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/User' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/users/details/{userId}': {
        get: {
            tags: ['Users'],
            summary: 'Get user by ID (Admin or Owner)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: 'User retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/User' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/users/update/{userId}': {
        put: {
            tags: ['Users'],
            summary: 'Update user (Admin or Owner)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                firstname: { type: 'string' },
                                lastname: { type: 'string' },
                                contact_phone: { type: 'string' },
                                address: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'User updated successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/User' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/users/password/{userId}': {
        put: {
            tags: ['Users'],
            summary: 'Update user password (Owner only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['currentPassword', 'newPassword', 'confirmPassword'],
                            properties: {
                                currentPassword: { type: 'string' },
                                newPassword: { type: 'string' },
                                confirmPassword: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Password updated successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/users/delete/{userId}': {
        delete: {
            tags: ['Users'],
            summary: 'Delete user (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: 'User deleted successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= VEHICLE MANAGEMENT ENDPOINTS =============
    '/vehicles': {
        get: {
            tags: ['Vehicles'],
            summary: 'Get all vehicles with filters',
            parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                { name: 'manufacturer', in: 'query', schema: { type: 'string' } },
                { name: 'model', in: 'query', schema: { type: 'string' } },
                { name: 'fuel_type', in: 'query', schema: { type: 'string', enum: ['petrol', 'diesel', 'electric', 'hybrid'] } },
                { name: 'availability', in: 'query', schema: { type: 'boolean' } },
                { name: 'min_rate', in: 'query', schema: { type: 'number' } },
                { name: 'max_rate', in: 'query', schema: { type: 'number' } }
            ],
            responses: {
                '200': {
                    description: 'Vehicles retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            vehicles: { type: 'array', items: { $ref: '#/components/schemas/Vehicle' } },
                                            total: { type: 'integer' },
                                            page: { type: 'integer' },
                                            limit: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Vehicles'],
            summary: 'Create a new vehicle (Admin only)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['vehicleSpec_id', 'rental_rate', 'license_plate'],
                            properties: {
                                vehicleSpec_id: { type: 'string', format: 'uuid' },
                                rental_rate: { type: 'string', example: '75.00' },
                                license_plate: { type: 'string', example: 'KCB123A' },
                                location_id: { type: 'string', format: 'uuid' },
                                availability: { type: 'boolean', default: true },
                                status: { type: 'string', enum: ['available', 'rented', 'maintenance', 'out_of_service', 'reserved'] },
                                mileage: { type: 'integer', default: 0 },
                                fuel_level: { type: 'integer', default: 100 },
                                condition_rating: { type: 'integer', minimum: 1, maximum: 10 }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Vehicle created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/Vehicle' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/vehicles/{vehicleId}': {
        get: {
            tags: ['Vehicles'],
            summary: 'Get vehicle by ID',
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: 'Vehicle retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/Vehicle' }
                                }
                            }
                        }
                    }
                }
            }
        },
        put: {
            tags: ['Vehicles'],
            summary: 'Update vehicle (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                rental_rate: { type: 'string', example: '80.00' },
                                availability: { type: 'boolean' },
                                status: { type: 'string', enum: ['available', 'rented', 'maintenance', 'out_of_service', 'reserved'] },
                                location_id: { type: 'string', format: 'uuid' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Vehicle updated successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/Vehicle' }
                                }
                            }
                        }
                    }
                }
            }
        },
        delete: {
            tags: ['Vehicles'],
            summary: 'Delete vehicle (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: 'Vehicle deleted successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= VEHICLE IMAGES ENDPOINTS =============
    '/vehicles/{vehicleId}/images': {
        get: {
            tags: ['VehicleImages'],
            summary: 'Get all images for a vehicle',
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: 'Vehicle images retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { type: 'array', items: { $ref: '#/components/schemas/VehicleImage' } },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['VehicleImages'],
            summary: 'Add new image to vehicle (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreateVehicleImageRequest' }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Image added successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/VehicleImage' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/images/{imageId}': {
        put: {
            tags: ['VehicleImages'],
            summary: 'Update vehicle image (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'imageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/UpdateVehicleImageRequest' }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Image updated successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/VehicleImage' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        },
        delete: {
            tags: ['VehicleImages'],
            summary: 'Delete vehicle image (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'imageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: 'Image deleted successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/vehicles/{vehicleId}/images/{imageId}/primary': {
        put: {
            tags: ['VehicleImages'],
            summary: 'Set primary image for vehicle (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                { name: 'imageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: 'Primary image set successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/VehicleImage' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/vehicles/{vehicleId}/images/reorder': {
        put: {
            tags: ['VehicleImages'],
            summary: 'Reorder vehicle images (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ReorderImagesRequest' }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Images reordered successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { type: 'array', items: { $ref: '#/components/schemas/VehicleImage' } },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= CLOUDINARY VEHICLE IMAGES ENDPOINTS =============
    '/vehicle-images/upload-signature': {
        post: {
            tags: ['VehicleImages'],
            summary: 'Get signed upload parameters for Cloudinary (Admin only)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['vehicleId'],
                            properties: {
                                vehicleId: { type: 'string', format: 'uuid', example: 'de7ddad4-d801-45ca-8066-a326d6dc6226' },
                                is360: { type: 'boolean', default: false, example: false }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Upload signature generated successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            signature: { type: 'string' },
                                            timestamp: { type: 'number' },
                                            public_id: { type: 'string' },
                                            folder: { type: 'string' },
                                            api_key: { type: 'string' },
                                            upload_url: { type: 'string' }
                                        }
                                    },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/vehicle-images/upload-confirm': {
        post: {
            tags: ['VehicleImages'],
            summary: 'Confirm successful upload and save to database (Admin only)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['vehicleId', 'cloudinary_public_id', 'secure_url', 'width', 'height', 'format', 'bytes'],
                            properties: {
                                vehicleId: { type: 'string', format: 'uuid' },
                                cloudinary_public_id: { type: 'string' },
                                secure_url: { type: 'string', format: 'uri' },
                                width: { type: 'number' },
                                height: { type: 'number' },
                                format: { type: 'string' },
                                bytes: { type: 'number' },
                                is_primary: { type: 'boolean', default: false },
                                is_360: { type: 'boolean', default: false },
                                alt: { type: 'string' },
                                caption: { type: 'string' },
                                display_order: { type: 'number', default: 0 }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Image uploaded and saved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/VehicleImage' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/vehicles/{vehicleId}/images/360': {
        get: {
            tags: ['VehicleImages'],
            summary: 'Get 360° images for a vehicle',
            parameters: [
                { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                '200': {
                    description: '360° images retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { type: 'array', items: { $ref: '#/components/schemas/VehicleImage' } },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= LOCATION MANAGEMENT ENDPOINTS =============
    '/locations': {
        get: {
            tags: ['Locations'],
            summary: 'Get all locations',
            parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                { name: 'search', in: 'query', schema: { type: 'string' } },
                { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'name' } },
                { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } }
            ],
            responses: {
                '200': {
                    description: 'Locations retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            locations: { type: 'array', items: { $ref: '#/components/schemas/Location' } },
                                            total: { type: 'integer' },
                                            page: { type: 'integer' },
                                            limit: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Locations'],
            summary: 'Create location (Admin only)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['name', 'address'],
                            properties: {
                                name: { type: 'string', example: 'Downtown Branch' },
                                address: { type: 'string', example: '123 Downtown Ave, City Center' },
                                contact_phone: { type: 'string', example: '+254712345890' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Location created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/Location' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= BOOKING MANAGEMENT ENDPOINTS =============
    '/bookings': {
        get: {
            tags: ['Bookings'],
            summary: 'Get all bookings (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] } }
            ],
            responses: {
                '200': {
                    description: 'Bookings retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            bookings: { type: 'array', items: { $ref: '#/components/schemas/Booking' } },
                                            total: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Bookings'],
            summary: 'Create a new booking',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['vehicle_id', 'location_id', 'booking_date', 'return_date'],
                            properties: {
                                vehicle_id: { type: 'string', format: 'uuid' },
                                location_id: { type: 'string', format: 'uuid' },
                                booking_date: { type: 'string', format: 'date-time', example: '2025-07-10T10:00:00.000Z' },
                                return_date: { type: 'string', format: 'date-time', example: '2025-07-15T10:00:00.000Z' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Booking created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/Booking' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= PAYMENT MANAGEMENT ENDPOINTS =============
    '/payments': {
        get: {
            tags: ['Payments'],
            summary: 'Get all payments (Admin only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'failed'] } }
            ],
            responses: {
                '200': {
                    description: 'Payments retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
                                            total: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Payments'],
            summary: 'Create a payment',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['booking_id', 'amount', 'payment_method'],
                            properties: {
                                booking_id: { type: 'string', format: 'uuid' },
                                amount: { type: 'number', example: 250.00 },
                                payment_method: { type: 'string', example: 'credit_card' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Payment created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/Payment' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= SUPPORT TICKET ENDPOINTS =============
    '/support-tickets': {
        get: {
            tags: ['Support'],
            summary: 'Get support tickets',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] } }
            ],
            responses: {
                '200': {
                    description: 'Support tickets retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            tickets: { type: 'array', items: { $ref: '#/components/schemas/SupportTicket' } },
                                            total: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Support'],
            summary: 'Create support ticket',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['subject', 'description'],
                            properties: {
                                subject: { type: 'string', example: 'Vehicle issue' },
                                description: { type: 'string', example: 'Detailed description of the issue' }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Support ticket created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/SupportTicket' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // ============= MAINTENANCE ENDPOINTS =============
    '/maintenance/statistics': {
        get: {
            tags: ['Maintenance'],
            summary: 'Get maintenance statistics for dashboard',
            description: 'Retrieve comprehensive maintenance statistics including cost summaries, status counts, and trends',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'start_date',
                    in: 'query',
                    description: 'Start date for statistics (ISO 8601 format)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                },
                {
                    name: 'end_date',
                    in: 'query',
                    description: 'End date for statistics (ISO 8601 format)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                },
                {
                    name: 'vehicle_id',
                    in: 'query',
                    description: 'Filter statistics for specific vehicle',
                    required: false,
                    schema: { type: 'string' }
                }
            ],
            responses: {
                '200': {
                    description: 'Maintenance statistics retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/MaintenanceStatistics' }
                                }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - Admin access required' }
            }
        }
    },
    '/maintenance': {
        get: {
            tags: ['Maintenance'],
            summary: 'Get all maintenance records with filtering and pagination',
            description: 'Retrieve all maintenance records with advanced filtering, sorting, and pagination options',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'page',
                    in: 'query',
                    description: 'Page number for pagination (default: 1)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, default: 1 }
                },
                {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of records per page (default: 20)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
                },
                {
                    name: 'vehicle_id',
                    in: 'query',
                    description: 'Filter by vehicle ID',
                    required: false,
                    schema: { type: 'string' }
                },
                {
                    name: 'maintenance_type',
                    in: 'query',
                    description: 'Filter by maintenance type',
                    required: false,
                    schema: { type: 'string', enum: ['routine', 'repair', 'inspection', 'emergency', 'recall', 'upgrade'] }
                },
                {
                    name: 'status',
                    in: 'query',
                    description: 'Filter by maintenance status',
                    required: false,
                    schema: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'] }
                },
                {
                    name: 'date_from',
                    in: 'query',
                    description: 'Filter records from this date (ISO 8601 format)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                },
                {
                    name: 'date_to',
                    in: 'query',
                    description: 'Filter records until this date (ISO 8601 format)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                },
                {
                    name: 'cost_min',
                    in: 'query',
                    description: 'Minimum cost filter',
                    required: false,
                    schema: { type: 'number' }
                },
                {
                    name: 'cost_max',
                    in: 'query',
                    description: 'Maximum cost filter',
                    required: false,
                    schema: { type: 'number' }
                },
                {
                    name: 'sortBy',
                    in: 'query',
                    description: 'Field to sort by (default: created_at)',
                    required: false,
                    schema: { type: 'string', default: 'created_at' }
                },
                {
                    name: 'sortOrder',
                    in: 'query',
                    description: 'Sort order (default: desc)',
                    required: false,
                    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
                }
            ],
            responses: {
                '200': {
                    description: 'Maintenance records retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MaintenanceRecord' }
                                    },
                                    pagination: {
                                        type: 'object',
                                        properties: {
                                            page: { type: 'integer' },
                                            limit: { type: 'integer' },
                                            total: { type: 'integer' },
                                            totalPages: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - Admin access required' }
            }
        },
        post: {
            tags: ['Maintenance'],
            summary: 'Create a new maintenance record',
            description: 'Create a new maintenance record for a vehicle',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreateMaintenanceRequest' }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Maintenance record created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/MaintenanceRecord' }
                                }
                            }
                        }
                    }
                },
                '400': { description: 'Bad request - Invalid input data' },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - Admin access required' }
            }
        }
    },
    '/maintenance/{id}': {
        put: {
            tags: ['Maintenance'],
            summary: 'Update a maintenance record',
            description: 'Update an existing maintenance record',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    description: 'Maintenance record ID',
                    required: true,
                    schema: { type: 'string' }
                }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/UpdateMaintenanceRequest' }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Maintenance record updated successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/MaintenanceRecord' }
                                }
                            }
                        }
                    }
                },
                '400': { description: 'Bad request - Invalid input data' },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - Admin access required' },
                '404': { description: 'Maintenance record not found' }
            }
        },
        delete: {
            tags: ['Maintenance'],
            summary: 'Delete a maintenance record',
            description: 'Delete an existing maintenance record',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    description: 'Maintenance record ID',
                    required: true,
                    schema: { type: 'string' }
                }
            ],
            responses: {
                '200': {
                    description: 'Maintenance record deleted successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - Admin access required' },
                '404': { description: 'Maintenance record not found' }
            }
        }
    },
    '/maintenance/vehicle/{vehicleId}': {
        get: {
            tags: ['Maintenance'],
            summary: 'Get maintenance records for a specific vehicle',
            description: 'Retrieve all maintenance records for a specific vehicle with pagination',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'vehicleId',
                    in: 'path',
                    description: 'Vehicle ID',
                    required: true,
                    schema: { type: 'string' }
                },
                {
                    name: 'page',
                    in: 'query',
                    description: 'Page number for pagination (default: 1)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, default: 1 }
                },
                {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of records per page (default: 20)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
                }
            ],
            responses: {
                '200': {
                    description: 'Vehicle maintenance records retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MaintenanceRecord' }
                                    },
                                    pagination: {
                                        type: 'object',
                                        properties: {
                                            page: { type: 'integer' },
                                            limit: { type: 'integer' },
                                            total: { type: 'integer' },
                                            totalPages: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '404': { description: 'Vehicle not found' }
            }
        }
    },
    '/maintenance/upcoming': {
        get: {
            tags: ['Maintenance'],
            summary: 'Get upcoming maintenance records',
            description: 'Retrieve maintenance records that are scheduled for the future',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of records to return (default: 10)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
                }
            ],
            responses: {
                '200': {
                    description: 'Upcoming maintenance records retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MaintenanceRecord' }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' }
            }
        }
    },
    '/maintenance/overdue': {
        get: {
            tags: ['Maintenance'],
            summary: 'Get overdue maintenance records',
            description: 'Retrieve maintenance records that are past their scheduled date and not completed',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of records to return (default: 10)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
                }
            ],
            responses: {
                '200': {
                    description: 'Overdue maintenance records retrieved successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MaintenanceRecord' }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' }
            }
        }
    },

    // ============= CHAT SYSTEM ENDPOINTS =============
    '/chat/tickets/{ticketId}/messages': {
        get: {
            tags: ['Chat'],
            summary: 'Get chat messages for a support ticket',
            description: 'Retrieve paginated chat messages for a specific support ticket. Users can only access their own tickets, while support agents and admins can access assigned or all tickets respectively.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'ticketId',
                    in: 'path',
                    required: true,
                    description: 'UUID of the support ticket',
                    schema: { type: 'string', format: 'uuid' }
                },
                {
                    name: 'page',
                    in: 'query',
                    description: 'Page number for pagination (default: 1)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, default: 1 }
                },
                {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of messages per page (default: 50, max: 100)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
                }
            ],
            responses: {
                '200': {
                    description: 'Chat messages retrieved successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ChatMessagesResponse' }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - User does not have permission to access this chat' },
                '404': { description: 'Not Found - Ticket does not exist' }
            }
        },
        post: {
            tags: ['Chat'],
            summary: 'Send a chat message',
            description: 'Send a new message in a support ticket chat. The message will be broadcast to all participants via WebSocket.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'ticketId',
                    in: 'path',
                    required: true,
                    description: 'UUID of the support ticket',
                    schema: { type: 'string', format: 'uuid' }
                }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/SendMessageRequest' },
                        examples: {
                            textMessage: {
                                summary: 'Text message',
                                value: {
                                    message: 'Hello! I need help with my booking issue.',
                                    messageType: 'text'
                                }
                            },
                            imageMessage: {
                                summary: 'Image message',
                                value: {
                                    message: 'Here is a screenshot of the error I am experiencing.',
                                    messageType: 'image',
                                    attachmentUrl: 'https://example.com/screenshot.png'
                                }
                            },
                            fileMessage: {
                                summary: 'File attachment',
                                value: {
                                    message: 'Please review this document.',
                                    messageType: 'file',
                                    attachmentUrl: 'https://example.com/document.pdf'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Message sent successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SendMessageResponse' }
                        }
                    }
                },
                '400': { description: 'Bad Request - Invalid message data' },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - User does not have permission to send messages to this chat' },
                '404': { description: 'Not Found - Ticket does not exist' }
            }
        }
    },
    '/chat/tickets/{ticketId}/messages/read': {
        put: {
            tags: ['Chat'],
            summary: 'Mark messages as read',
            description: 'Mark all unread messages in a ticket chat as read by the current user. This will update the read status and notify other participants via WebSocket.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'ticketId',
                    in: 'path',
                    required: true,
                    description: 'UUID of the support ticket',
                    schema: { type: 'string', format: 'uuid' }
                }
            ],
            responses: {
                '200': {
                    description: 'Messages marked as read successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/MarkAsReadResponse' }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - User does not have permission to access this chat' },
                '404': { description: 'Not Found - Ticket does not exist' }
            }
        }
    },
    '/chat/tickets/{ticketId}/stats': {
        get: {
            tags: ['Chat'],
            summary: 'Get chat statistics',
            description: 'Retrieve statistics for a specific ticket chat including message counts, participants, and last activity.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'ticketId',
                    in: 'path',
                    required: true,
                    description: 'UUID of the support ticket',
                    schema: { type: 'string', format: 'uuid' }
                }
            ],
            responses: {
                '200': {
                    description: 'Chat statistics retrieved successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ChatStatisticsResponse' }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - User does not have permission to access this chat' },
                '404': { description: 'Not Found - Ticket does not exist' }
            }
        }
    },
    '/chat/active': {
        get: {
            tags: ['Chat'],
            summary: 'Get active chats (Support/Admin only)',
            description: 'Retrieve a list of active chat conversations for support agents and administrators. This endpoint provides an overview of ongoing tickets with chat activity.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'page',
                    in: 'query',
                    description: 'Page number for pagination (default: 1)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, default: 1 }
                },
                {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of chats per page (default: 20, max: 50)',
                    required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 }
                },
                {
                    name: 'unread',
                    in: 'query',
                    description: 'Filter to show only chats with unread messages',
                    required: false,
                    schema: { type: 'boolean' }
                },
                {
                    name: 'assigned_to',
                    in: 'query',
                    description: 'Filter chats assigned to a specific user ID',
                    required: false,
                    schema: { type: 'string', format: 'uuid' }
                }
            ],
            responses: {
                '200': {
                    description: 'Active chats retrieved successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ActiveChatsResponse' }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - Only support agents and administrators can access this endpoint' }
            }
        }
    },
    '/chat/tickets/{ticketId}/typing/start': {
        post: {
            tags: ['Chat'],
            summary: 'Start typing indicator',
            description: 'Notify other chat participants that the current user has started typing. This will broadcast a typing indicator via WebSocket.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'ticketId',
                    in: 'path',
                    required: true,
                    description: 'UUID of the support ticket',
                    schema: { type: 'string', format: 'uuid' }
                }
            ],
            responses: {
                '200': {
                    description: 'Typing indicator started successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/TypingIndicatorResponse' }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - User does not have permission to access this chat' },
                '404': { description: 'Not Found - Ticket does not exist' }
            }
        }
    },
    '/chat/tickets/{ticketId}/typing/stop': {
        post: {
            tags: ['Chat'],
            summary: 'Stop typing indicator',
            description: 'Notify other chat participants that the current user has stopped typing. This will remove the typing indicator via WebSocket.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'ticketId',
                    in: 'path',
                    required: true,
                    description: 'UUID of the support ticket',
                    schema: { type: 'string', format: 'uuid' }
                }
            ],
            responses: {
                '200': {
                    description: 'Typing indicator stopped successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/TypingIndicatorResponse' }
                        }
                    }
                },
                '401': { description: 'Unauthorized - Authentication required' },
                '403': { description: 'Forbidden - User does not have permission to access this chat' },
                '404': { description: 'Not Found - Ticket does not exist' }
            }
        }
    }
};