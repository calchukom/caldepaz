import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import db from '../../drizzle/db';
import { users } from '../../drizzle/schema';
import {
    getAllUsers,
    getUserById,
    getUserByEmail,
    createUser,
    updateUser,
    deleteUser,
    updateUserPassword,
    getUserStatistics,
    userExistsByEmail,
    type UserUpdateData
} from '../../users/user.service';

// Mock data
const testUserData = {
    admin: {
        user_id: '12345678-1234-1234-1234-123456789012',
        firstname: 'Service',
        lastname: 'Admin',
        email: 'serviceadmin@example.com',
        password: 'servicetest123',
        role: 'admin' as const,
        contact_phone: '+254700000010',
        address: 'Service Admin Address'
    },
    user: {
        user_id: '87654321-4321-4321-4321-210987654321',
        firstname: 'Service',
        lastname: 'User',
        email: 'serviceuser@example.com',
        password: 'servicetest123',
        role: 'user' as const,
        contact_phone: '+254700000011',
        address: 'Service User Address'
    }
};

let createdTestUsers: any[] = [];

describe('User Service Tests', () => {
    beforeAll(async () => {
        // Set up test environment
        process.env.NODE_ENV = 'test';

        // Create test users
        const hashedPasswordAdmin = await bcrypt.hash(testUserData.admin.password, 10);
        const hashedPasswordUser = await bcrypt.hash(testUserData.user.password, 10);

        const [adminUser] = await db.insert(users).values({
            ...testUserData.admin,
            password: hashedPasswordAdmin
        }).returning();

        const [regularUser] = await db.insert(users).values({
            ...testUserData.user,
            password: hashedPasswordUser
        }).returning();

        createdTestUsers = [adminUser, regularUser];
    });

    afterAll(async () => {
        // Clean up test data
        for (const user of createdTestUsers) {
            try {
                await db.delete(users).where(eq(users.user_id, user.user_id));
            } catch (error) {
                // User might already be deleted
            }
        }
    });

    describe('getAllUsers', () => {
        it('should return paginated users', async () => {
            const result = await getAllUsers(1, 10);

            expect(result).toHaveProperty('users');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('page', 1);
            expect(result).toHaveProperty('limit', 10);
            expect(result).toHaveProperty('totalPages');
            expect(Array.isArray(result.users)).toBe(true);
            expect(typeof result.total).toBe('number');
            expect(result.totalPages).toBe(Math.ceil(result.total / 10));
        });

        it('should filter users by search term', async () => {
            const result = await getAllUsers(1, 10, 'Service');

            expect(result.users.length).toBeGreaterThan(0);
            result.users.forEach(user => {
                const hasSearchTerm =
                    user.firstname.toLowerCase().includes('service') ||
                    user.lastname.toLowerCase().includes('service') ||
                    user.email.toLowerCase().includes('service');
                expect(hasSearchTerm).toBe(true);
            });
        });

        it('should filter users by role', async () => {
            const result = await getAllUsers(1, 10, undefined, 'admin');

            result.users.forEach(user => {
                expect(user.role).toBe('admin');
            });
        });

        it('should sort users correctly', async () => {
            const resultAsc = await getAllUsers(1, 10, undefined, undefined, 'email', 'asc');
            const resultDesc = await getAllUsers(1, 10, undefined, undefined, 'email', 'desc');

            expect(resultAsc.users.length).toBeGreaterThan(0);
            expect(resultDesc.users.length).toBeGreaterThan(0);

            if (resultAsc.users.length > 1) {
                expect(resultAsc.users[0].email <= resultAsc.users[1].email).toBe(true);
            }
        });

        it('should not return password field', async () => {
            const result = await getAllUsers(1, 10);

            result.users.forEach(user => {
                expect(user).not.toHaveProperty('password');
            });
        });

        it('should handle pagination correctly', async () => {
            const page1 = await getAllUsers(1, 1);
            const page2 = await getAllUsers(2, 1);

            expect(page1.page).toBe(1);
            expect(page2.page).toBe(2);
            expect(page1.limit).toBe(1);
            expect(page2.limit).toBe(1);

            if (page1.total > 1) {
                expect(page1.users[0].user_id).not.toBe(page2.users[0]?.user_id);
            }
        });
    });

    describe('getUserById', () => {
        it('should return user by valid ID', async () => {
            const user = await getUserById(testUserData.admin.user_id);

            expect(user).toBeTruthy();
            expect(user?.email).toBe(testUserData.admin.email);
            expect(user?.firstname).toBe(testUserData.admin.firstname);
            expect(user).not.toHaveProperty('password');
        });

        it('should return null for non-existent ID', async () => {
            const user = await getUserById('00000000-0000-0000-0000-000000000000');

            expect(user).toBeNull();
        });

        it('should not return password field', async () => {
            const user = await getUserById(testUserData.user.user_id);

            expect(user).toBeTruthy();
            expect(user).not.toHaveProperty('password');
        });
    });

    describe('getUserByEmail', () => {
        it('should return user by valid email', async () => {
            const user = await getUserByEmail(testUserData.admin.email);

            expect(user).toBeTruthy();
            expect(user?.email).toBe(testUserData.admin.email);
            expect(user?.firstname).toBe(testUserData.admin.firstname);
            expect(user).not.toHaveProperty('password');
        });

        it('should return null for non-existent email', async () => {
            const user = await getUserByEmail('nonexistent@example.com');

            expect(user).toBeNull();
        });

        it('should be case insensitive', async () => {
            const user = await getUserByEmail(testUserData.admin.email.toUpperCase());

            expect(user).toBeTruthy();
            expect(user?.email).toBe(testUserData.admin.email);
        });

        it('should not return password field', async () => {
            const user = await getUserByEmail(testUserData.user.email);

            expect(user).toBeTruthy();
            expect(user).not.toHaveProperty('password');
        });
    });

    describe('createUser', () => {
        const newUserData = {
            firstname: 'New',
            lastname: 'Service',
            email: 'newservice@example.com',
            password: 'newservice123',
            contact_phone: '+254700000012',
            address: 'New Service Address',
            role: 'user' as const
        };

        afterEach(async () => {
            // Clean up created user
            try {
                await db.delete(users).where(eq(users.email, newUserData.email));
            } catch (error) {
                // User might not exist
            }
        });

        it('should create new user successfully', async () => {
            const user = await createUser(newUserData);

            expect(user).toBeTruthy();
            expect(user.email).toBe(newUserData.email);
            expect(user.firstname).toBe(newUserData.firstname);
            expect(user.lastname).toBe(newUserData.lastname);
            expect(user.role).toBe(newUserData.role);
            expect(user).not.toHaveProperty('password');
        });

        it('should throw error for duplicate email', async () => {
            // Create user first time
            await createUser(newUserData);

            // Try to create again with same email
            await expect(createUser({
                ...newUserData,
                firstname: 'Different'
            })).rejects.toThrow();
        });

        it('should hash password correctly', async () => {
            const user = await createUser(newUserData);

            // Verify user was created and password is hashed
            const dbUser = await db.select().from(users).where(eq(users.user_id, user.user_id)).limit(1);
            expect(dbUser[0].password).not.toBe(newUserData.password);
            expect(dbUser[0].password.length).toBeGreaterThan(20); // Hashed password should be longer
        });

        it('should set default role to user', async () => {
            const userWithoutRole = {
                firstname: 'No',
                lastname: 'Role',
                email: 'norole@example.com',
                password: 'password123',
                contact_phone: '+254700000013',
                address: 'No Role Address'
            };

            const user = await createUser(userWithoutRole);

            expect(user.role).toBe('user');

            // Clean up
            await db.delete(users).where(eq(users.email, userWithoutRole.email));
        });
    });

    describe('updateUser', () => {
        const updateData: UserUpdateData = {
            firstname: 'Updated',
            lastname: 'Service',
            contact_phone: '+254700000014',
            address: 'Updated Service Address'
        };

        it('should update user successfully', async () => {
            const updatedUser = await updateUser(testUserData.user.user_id, updateData);

            expect(updatedUser).toBeTruthy();
            expect(updatedUser?.firstname).toBe(updateData.firstname);
            expect(updatedUser?.lastname).toBe(updateData.lastname);
            expect(updatedUser?.contact_phone).toBe(updateData.contact_phone);
            expect(updatedUser?.address).toBe(updateData.address);
            expect(updatedUser).not.toHaveProperty('password');
        });

        it('should return null for non-existent user', async () => {
            const result = await updateUser('00000000-0000-0000-0000-000000000000', updateData);

            expect(result).toBeNull();
        });

        it('should update email if provided and unique', async () => {
            const newEmail = 'newemail@example.com';
            const updatedUser = await updateUser(testUserData.user.user_id, {
                ...updateData,
                email: newEmail
            });

            expect(updatedUser?.email).toBe(newEmail);

            // Restore original email
            await updateUser(testUserData.user.user_id, {
                email: testUserData.user.email
            });
        });

        it('should throw error for duplicate email', async () => {
            await expect(updateUser(testUserData.user.user_id, {
                email: testUserData.admin.email
            })).rejects.toThrow('Email already exists');
        });

        it('should handle partial updates', async () => {
            const partialUpdate = { firstname: 'PartialUpdate' };
            const updatedUser = await updateUser(testUserData.user.user_id, partialUpdate);

            expect(updatedUser?.firstname).toBe(partialUpdate.firstname);
            expect(updatedUser?.email).toBe(testUserData.user.email); // Should remain unchanged
        });

        it('should update timestamp', async () => {
            const originalUser = await getUserById(testUserData.user.user_id);

            // Wait a moment to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 100));

            const updatedUser = await updateUser(testUserData.user.user_id, updateData);

            expect(updatedUser?.updated_at).toBeTruthy();
            if (originalUser && updatedUser) {
                expect(new Date(updatedUser.updated_at).getTime()).toBeGreaterThan(
                    new Date(originalUser.updated_at).getTime()
                );
            }
        });
    });

    describe('updateUserPassword', () => {
        const currentPassword = testUserData.user.password;
        const newPassword = 'newuserpassword123';

        it('should update password successfully', async () => {
            const result = await updateUserPassword(testUserData.user.user_id, currentPassword, newPassword);

            expect(result.success).toBe(true);
            expect(result.message).toContain('updated successfully');

            // Verify password was actually changed
            const dbUser = await db.select().from(users).where(eq(users.user_id, testUserData.user.user_id)).limit(1);
            const isNewPasswordValid = await bcrypt.compare(newPassword, dbUser[0].password);
            expect(isNewPasswordValid).toBe(true);

            // Restore original password for other tests
            const hashedOriginal = await bcrypt.hash(currentPassword, 12);
            await db.update(users)
                .set({ password: hashedOriginal })
                .where(eq(users.user_id, testUserData.user.user_id));
        });

        it('should fail with incorrect current password', async () => {
            const result = await updateUserPassword(testUserData.user.user_id, 'wrongpassword', newPassword);

            expect(result.success).toBe(false);
            expect(result.message).toContain('incorrect');
        });

        it('should fail for non-existent user', async () => {
            const result = await updateUserPassword('00000000-0000-0000-0000-000000000000', currentPassword, newPassword);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });

        it('should hash new password', async () => {
            await updateUserPassword(testUserData.user.user_id, currentPassword, newPassword);

            const dbUser = await db.select().from(users).where(eq(users.user_id, testUserData.user.user_id)).limit(1);
            expect(dbUser[0].password).not.toBe(newPassword);
            expect(dbUser[0].password.length).toBeGreaterThan(20);

            // Restore password
            const hashedOriginal = await bcrypt.hash(currentPassword, 12);
            await db.update(users)
                .set({ password: hashedOriginal })
                .where(eq(users.user_id, testUserData.user.user_id));
        });
    });

    describe('deleteUser', () => {
        let userToDelete: any;

        beforeEach(async () => {
            // Clean up any existing test users first to avoid duplicate errors
            await db.delete(users).where(eq(users.email, 'deleteservice@example.com'));

            // Create a user to delete
            const hashedPassword = await bcrypt.hash('deleteservice123', 10);
            const [user] = await db.insert(users).values({
                firstname: 'Delete',
                lastname: 'Service',
                email: 'deleteservice@example.com',
                password: hashedPassword,
                role: 'user',
                contact_phone: '+254700000015',
                address: 'Delete Service Address'
            }).returning();
            userToDelete = user;
        });

        it('should delete user successfully', async () => {
            const result = await deleteUser(userToDelete.user_id);

            expect(result).toBe(true);

            // Verify user was deleted
            const deletedUser = await getUserById(userToDelete.user_id);
            expect(deletedUser).toBeNull();
        });

        it('should return false for non-existent user', async () => {
            const result = await deleteUser('00000000-0000-0000-0000-000000000000');

            expect(result).toBe(false);
        });

        it('should handle cascading deletes', async () => {
            // This test assumes the deleteUser function handles cascading deletes
            // In a real scenario, you might have bookings, payments, etc. linked to the user
            const result = await deleteUser(userToDelete.user_id);

            expect(result).toBe(true);
        });
    });

    describe('getUserStatistics', () => {
        it('should return user statistics', async () => {
            const stats = await getUserStatistics();

            expect(stats).toHaveProperty('totalUsers');
            expect(stats).toHaveProperty('totalAdmins');
            expect(stats).toHaveProperty('totalRegularUsers');
            expect(stats).toHaveProperty('recentRegistrations');
            expect(stats).toHaveProperty('usersByMonth');

            expect(typeof stats.totalUsers).toBe('number');
            expect(typeof stats.totalAdmins).toBe('number');
            expect(typeof stats.totalRegularUsers).toBe('number');
            expect(typeof stats.recentRegistrations).toBe('number');
            expect(Array.isArray(stats.usersByMonth)).toBe(true);

            expect(stats.totalUsers).toBeGreaterThanOrEqual(stats.totalAdmins + stats.totalRegularUsers);
        });

        it('should have consistent totals', async () => {
            const stats = await getUserStatistics();

            // Total users should be sum of admins and regular users (assuming no other roles)
            expect(stats.totalUsers).toBeGreaterThanOrEqual(stats.totalAdmins);
            expect(stats.totalUsers).toBeGreaterThanOrEqual(stats.totalRegularUsers);
        });
    });

    describe('userExistsByEmail', () => {
        it('should return true for existing email', async () => {
            const exists = await userExistsByEmail(testUserData.admin.email);

            expect(exists).toBe(true);
        });

        it('should return false for non-existing email', async () => {
            const exists = await userExistsByEmail('nonexistent@example.com');

            expect(exists).toBe(false);
        });

        it('should be case insensitive', async () => {
            const exists = await userExistsByEmail(testUserData.admin.email.toUpperCase());

            expect(exists).toBe(true);
        });

        it('should handle malformed emails gracefully', async () => {
            const exists = await userExistsByEmail('notanemail');

            expect(exists).toBe(false);
        });
    });
});
