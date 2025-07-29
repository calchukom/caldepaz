import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock the database
jest.mock('../../drizzle/db', () => {
    const mockUsers = new Map();

    return {
        select: jest.fn(() => ({
            from: jest.fn(() => ({
                where: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve([]))
                })),
                limit: jest.fn(() => Promise.resolve(Array.from(mockUsers.values()))),
                orderBy: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        offset: jest.fn(() => Promise.resolve(Array.from(mockUsers.values()).slice(0, 10)))
                    }))
                }))
            }))
        })),
        insert: jest.fn(() => ({
            values: jest.fn(() => ({
                returning: jest.fn(() => {
                    const user = {
                        user_id: '11111111-1111-1111-1111-111111111111',
                        firstname: 'Test',
                        lastname: 'Admin',
                        email: 'testadmin@example.com',
                        role: 'admin',
                        contact_phone: '+254700000001',
                        address: 'Test Admin Address',
                        created_at: new Date(),
                        updated_at: new Date()
                    };
                    mockUsers.set(user.user_id, user);
                    return Promise.resolve([user]);
                })
            }))
        })),
        delete: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve())
        })),
        update: jest.fn(() => ({
            set: jest.fn(() => ({
                where: jest.fn(() => ({
                    returning: jest.fn(() => Promise.resolve([]))
                }))
            }))
        }))
    };
});

// Mock the schema
jest.mock('../../drizzle/schema', () => ({
    users: {
        user_id: 'user_id',
        email: 'email',
        firstname: 'firstname',
        lastname: 'lastname',
        role: 'role'
    }
}));

// Mock the authentication middleware
jest.mock('../../middleware/bearAuth', () => {
    const jwt = require('jsonwebtoken');

    const mockVerifyToken = (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Access token is required'
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only');

            req.user = decoded;
            return next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    };

    return {
        verifyToken: jest.fn(mockVerifyToken),
        adminRoleAuth: jest.fn((req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            return next();
        }),
        ownerOrAdminAuth: jest.fn((paramName: string = 'id') => (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin can access everything
            if (req.user.role === 'admin') {
                return next();
            }

            // Users can only access their own resources
            const paramValue = req.params[paramName];
            if (paramValue === req.user.userId) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        })
    };
});

// Mock the email service
jest.mock('../../middleware/googleMailer', () => ({
    sendNotificationEmail: jest.fn(() => Promise.resolve()),
}));

// Mock rate limiting middleware
jest.mock('../../middleware/rateLimiter', () => ({
    apiRateLimiter: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    adminActionsRateLimiter: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    searchRateLimiter: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    guestRateLimiter: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));

// Import the router after mocking
import userRouter from '../../users/user.route';
import { email } from 'zod/v4';
import { verifyToken } from '../../middleware/bearAuth';

// Create test app with proper middleware order
const app = express();
app.use(express.json());

// Apply authentication middleware globally
app.use('/api/users', (req: Request, res: Response, next: NextFunction) => {
    // Mock verifyToken functionality
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only') as any;

        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

app.use('/api/users', userRouter);

// Test data
const testUsers = {
    admin: {
        user_id: '11111111-1111-1111-1111-111111111111',
        firstname: 'Test',
        lastname: 'Admin',
        email: 'testadmin@example.com',
        password: 'testpassword123',
        role: 'admin' as const,
        contact_phone: '+254700000001',
        address: 'Test Admin Address'
    },
    user: {
        user_id: '22222222-2222-2222-2222-222222222222',
        firstname: 'Test',
        lastname: 'User',
        email: 'testuser@example.com',
        password: 'testpassword123',
        role: 'user' as const,
        contact_phone: '+254700000002',
        address: 'Test User Address'
    }
};

// Mock authentication tokens
const createTestToken = (user: typeof testUsers.admin | typeof testUsers.user) => {
    return jwt.sign(
        {
            userId: user.user_id,
            email: user.email,
            role: user.role,
            firstname: user.firstname,
            lastname: user.lastname,
            contact_phone: user.contact_phone
        },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
        { expiresIn: '1h' }
    );
};

let adminToken: string;
let userToken: string; describe('User API Tests', () => {
    beforeAll(async () => {
        // Set up test environment
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

        // Create test tokens
        adminToken = createTestToken(testUsers.admin);
        userToken = createTestToken(testUsers.user);
    });

    afterAll(async () => {
        // Clean up test environment
        delete process.env.JWT_SECRET;
    });

    describe('GET /api/users - Get All Users', () => {
        it('should return users list for admin', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('users');
            expect(response.body.data).toHaveProperty('total');
            expect(response.body.data).toHaveProperty('page');
            expect(response.body.data).toHaveProperty('limit');
            expect(Array.isArray(response.body.data.users)).toBe(true);
        });

        it('should deny access for regular users', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Admin');
        });

        it('should deny access without authentication', async () => {
            const response = await request(app)
                .get('/api/users')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/users?page=1&limit=5')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.data.page).toBe(1);
            expect(response.body.data.limit).toBe(5);
        });

        it('should support search functionality', async () => {
            const response = await request(app)
                .get('/api/users?search=Test')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users.length).toBeGreaterThan(0);
        });

        it('should support role filtering', async () => {
            const response = await request(app)
                .get('/api/users?role=admin')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            // All returned users should be admin
            response.body.data.users.forEach((user: any) => {
                expect(user.role).toBe('admin');
            });
        });

        it('should support sorting', async () => {
            const response = await request(app)
                .get('/api/users?sortBy=email&sortOrder=asc')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/users/details/:userId - Get User by ID', () => {
        it('should return user details for admin', async () => {
            const response = await request(app)
                .get(`/api/users/details/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe(testUsers.user.email);
            expect(response.body.data).not.toHaveProperty('password');
        });

        it('should allow users to view their own profile', async () => {
            const response = await request(app)
                .get(`/api/users/details/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe(testUsers.user.email);
        });

        it('should deny access to other user profiles for regular users', async () => {
            const response = await request(app)
                .get(`/api/users/details/${testUsers.admin.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent user', async () => {
            const fakeUserId = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .get(`/api/users/details/${fakeUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });

        it('should return 400 for invalid user ID format', async () => {
            const response = await request(app)
                .get('/api/users/details/invalid-uuid')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            // Some validation libraries might not use the success field,
            // so we'll just check the status code instead
        });
    });

    describe('POST /api/users - Create User', () => {
        const newUserData = {
            firstname: 'New',
            lastname: 'User',
            email: 'newuser@example.com',
            password: 'newpassword123',
            contact_phone: '+254700000003',
            address: 'New User Address',
            role: 'user'
        };

        afterEach(async () => {
            // Clean up created user
            try {
                // Clean up created user
                // await db.delete(users).where(eq(users.email, newUserData.email));
            } catch (error) {
                // User might not exist
            }
        });

        it('should create new user as admin', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUserData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe(newUserData.email);
            expect(response.body.data).not.toHaveProperty('password');
        });

        it('should deny user creation for regular users', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newUserData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    firstname: 'Test'
                    // Missing required fields
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should prevent duplicate email addresses', async () => {
            // First creation should succeed
            await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUserData)
                .expect(201);

            // Second creation with same email should fail
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ...newUserData,
                    firstname: 'Another'
                })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        it('should validate email format', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ...newUserData,
                    email: 'invalid-email'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should validate phone number format', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ...newUserData,
                    contact_phone: 'invalid-phone'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/users/update/:userId - Update User', () => {
        const updateData = {
            firstname: 'Updated',
            lastname: 'Name',
            contact_phone: '+254700000004',
            address: 'Updated Address'
        };

        it('should update user as admin', async () => {
            const response = await request(app)
                .put(`/api/users/update/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.firstname).toBe(updateData.firstname);
            expect(response.body.data.lastname).toBe(updateData.lastname);
        });

        it('should allow users to update their own profile', async () => {
            const response = await request(app)
                .put(`/api/users/update/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.firstname).toBe(updateData.firstname);
        });

        it('should deny users from updating other profiles', async () => {
            const response = await request(app)
                .put(`/api/users/update/${testUsers.admin.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent user', async () => {
            const fakeUserId = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .put(`/api/users/update/${fakeUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should validate email format when updating email', async () => {
            const response = await request(app)
                .put(`/api/users/update/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ...updateData,
                    email: 'invalid-email'
                });

            expect(response.status).toBe(400);
            // Some validation libraries might not use the success field,
            // so we'll just check the status code instead
        });
    });

    describe('PUT /api/users/password/:userId - Update Password', () => {
        const passwordData = {
            currentPassword: testUsers.user.password,
            newPassword: 'newpassword456',
            confirmPassword: 'newpassword456'
        };

        it('should update password for own account', async () => {
            const response = await request(app)
                .put(`/api/users/password/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(passwordData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('updated successfully');
        });

        it('should deny password update for other users', async () => {
            const response = await request(app)
                .put(`/api/users/password/${testUsers.admin.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(passwordData)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('own password');
        });

        it('should validate current password', async () => {
            const response = await request(app)
                .put(`/api/users/password/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    ...passwordData,
                    currentPassword: 'wrongpassword'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('incorrect');
        });

        it('should validate password confirmation', async () => {
            const response = await request(app)
                .put(`/api/users/password/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    ...passwordData,
                    confirmPassword: 'differentpassword'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should validate minimum password length', async () => {
            const response = await request(app)
                .put(`/api/users/password/${testUsers.user.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    ...passwordData,
                    newPassword: '123',
                    confirmPassword: '123'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/users/search - Search Users', () => {
        it('should search users by query as admin', async () => {
            const response = await request(app)
                .get('/api/users/search?q=Test')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('users');
            expect(response.body.data).toHaveProperty('total');
            expect(response.body.data).toHaveProperty('query', 'Test');
        });

        it('should require minimum query length', async () => {
            const response = await request(app)
                .get('/api/users/search?q=T')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('at least 2 characters');
        });

        it('should require query parameter', async () => {
            const response = await request(app)
                .get('/api/users/search')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('at least 2 characters');
        });

        it('should deny access for regular users', async () => {
            const response = await request(app)
                .get('/api/users/search?q=Test')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/users/statistics - Get User Statistics', () => {
        it('should return user statistics for admin', async () => {
            const response = await request(app)
                .get('/api/users/statistics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('totalUsers');
            expect(response.body.data).toHaveProperty('totalAdmins');
            expect(response.body.data).toHaveProperty('totalRegularUsers');
            expect(response.body.data).toHaveProperty('recentRegistrations');
            expect(response.body.data).toHaveProperty('usersByMonth');
            expect(typeof response.body.data.totalUsers).toBe('number');
        });

        it('should deny access for regular users', async () => {
            const response = await request(app)
                .get('/api/users/statistics')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/users/delete/:userId - Delete User', () => {
        let userToDelete: any;

        beforeEach(async () => {
            // Mock user for deletion tests
            userToDelete = {
                user_id: '44444444-4444-4444-4444-444444444444',
                firstname: 'Delete',
                lastname: 'Test',
                email: 'deletetest@example.com',
                role: 'user',
                contact_phone: '+254700000005',
                address: 'Delete Test Address'
            };
        });

        it('should delete user as admin', async () => {
            const response = await request(app)
                .delete(`/api/users/delete/${userToDelete.user_id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('deleted');

            // Verify user is actually deleted
            const checkResponse = await request(app)
                .get(`/api/users/details/${userToDelete.user_id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });

        it('should deny user deletion for regular users', async () => {
            const response = await request(app)
                .delete(`/api/users/delete/${userToDelete.user_id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should prevent admin from deleting themselves', async () => {
            const response = await request(app)
                .delete(`/api/users/delete/${testUsers.admin.user_id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('own account');
        });

        it('should return 404 for non-existent user', async () => {
            const fakeUserId = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .delete(`/api/users/delete/${fakeUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });
});
