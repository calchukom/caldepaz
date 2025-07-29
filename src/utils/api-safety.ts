/**
 * Fixes for Support Tickets Frontend - Handles undefined result.data.map errors
 */

// Safe data mapper utility
export const safeDataMap = <T, R>(
    result: any,
    mapFn: (item: T) => R,
    fallback: R[] = []
): R[] => {
    if (!result?.data || !Array.isArray(result.data)) {
        console.warn('API response data is undefined or not an array:', result);
        return fallback;
    }
    return result.data.map(mapFn);
};

// Safe data access utility
export const safeDataAccess = <T>(
    result: any,
    fallback: T[] = []
): T[] => {
    if (!result?.data || !Array.isArray(result.data)) {
        console.warn('API response data is undefined or not an array:', result);
        return fallback;
    }
    return result.data;
};

// Response validator
export const validateApiResponse = (result: any): boolean => {
    return result &&
        result.success !== false &&
        result.data !== undefined;
};

// Safe RTK Query tag provider helper
export const createSafeProvidesTags = <T extends { ticket_id?: string; id?: string }>(
    tagType: string,
    idField: keyof T = 'ticket_id'
) => {
    return (result: any) => {
        if (!validateApiResponse(result)) {
            return [{ type: tagType, id: 'LIST' }];
        }

        const data = safeDataAccess<T>(result);
        return [
            ...data.map((item) => ({
                type: tagType,
                id: item[idField] || 'UNKNOWN'
            })),
            { type: tagType, id: 'LIST' },
        ];
    };
};

// WebSocket connection utility with error handling
export const createWebSocketConnection = (serverUrl: string, token: string) => {
    if (typeof window === 'undefined' || !token) {
        console.warn('WebSocket: Invalid environment or missing token');
        return null;
    }

    try {
        const { io } = require('socket.io-client');

        const socket = io(serverUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('✅ WebSocket connected successfully');
        });

        socket.on('disconnect', (reason: string) => {
            console.log('❌ WebSocket disconnected:', reason);
        });

        socket.on('connect_error', (error: Error) => {
            console.error('🚫 WebSocket connection error:', error.message);
        });

        return socket;
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        return null;
    }
};

// Enhanced API slice configuration with error handling
export const createSafeApiSlice = (baseUrl: string) => {
    const { createApi, fetchBaseQuery } = require('@reduxjs/toolkit/query/react');

    return createApi({
        reducerPath: 'supportTicketsApi',
        baseQuery: fetchBaseQuery({
            baseUrl: baseUrl,
            prepareHeaders: (headers: any, { getState }: any) => {
                const token = getState()?.auth?.token;
                if (token) {
                    headers.set('authorization', `Bearer ${token}`);
                }
                return headers;
            },
            // Add response validation
            responseHandler: async (response: Response) => {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const data = await response.json();
                        // Validate response structure
                        if (!validateApiResponse(data)) {
                            console.warn('Invalid API response structure:', data);
                        }
                        return data;
                    } catch (error) {
                        console.error('Failed to parse JSON response:', error);
                        throw new Error('Invalid JSON response');
                    }
                }
                return response.text();
            },
        }),
        tagTypes: ['SupportTicket', 'TicketStats', 'Dropdowns'],
        endpoints: (builder: any) => ({
            // Get tickets with safe data handling
            getTickets: builder.query({
                query: (params: any) => ({
                    url: '',
                    params: {
                        page: params.page || 1,
                        limit: params.limit || 10,
                        ...(params.status && { status: params.status }),
                        ...(params.priority && { priority: params.priority }),
                        ...(params.category && { category: params.category }),
                        ...(params.search && { search: params.search }),
                        sortBy: params.sortBy || 'created_at',
                        sortOrder: params.sortOrder || 'desc',
                    },
                }),
                providesTags: createSafeProvidesTags('SupportTicket'),
            }),

            // Get single ticket with error handling
            getTicketById: builder.query({
                query: (id: string) => `/${id}`,
                providesTags: (result: any, error: any, id: string) => [
                    { type: 'SupportTicket', id: id }
                ],
            }),

            // Create ticket with optimistic updates
            createTicket: builder.mutation({
                query: (body: any) => ({
                    url: '',
                    method: 'POST',
                    body,
                }),
                invalidatesTags: [{ type: 'SupportTicket', id: 'LIST' }],
            }),

            // Update ticket with error handling
            updateTicket: builder.mutation({
                query: ({ id, ...patch }: any) => ({
                    url: `/${id}`,
                    method: 'PATCH',
                    body: patch,
                }),
                invalidatesTags: (result: any, error: any, { id }: any) => [
                    { type: 'SupportTicket', id },
                    { type: 'SupportTicket', id: 'LIST' },
                ],
            }),

            // Delete ticket
            deleteTicket: builder.mutation({
                query: (id: string) => ({
                    url: `/${id}`,
                    method: 'DELETE',
                }),
                invalidatesTags: [{ type: 'SupportTicket', id: 'LIST' }],
            }),

            // Bulk operations with safe handling
            bulkUpdateTickets: builder.mutation({
                query: (body: any) => ({
                    url: '/bulk-update',
                    method: 'POST',
                    body,
                }),
                invalidatesTags: [{ type: 'SupportTicket', id: 'LIST' }],
            }),

            bulkDeleteTickets: builder.mutation({
                query: (body: any) => ({
                    url: '/bulk-delete',
                    method: 'POST',
                    body,
                }),
                invalidatesTags: [{ type: 'SupportTicket', id: 'LIST' }],
            }),
        }),
    });
};

// React hook for safe data handling in components
export const useSafeTicketData = (queryResult: any) => {
    const {
        data: rawData,
        error,
        isLoading,
        isError,
        isFetching,
        refetch
    } = queryResult;

    // Safe data extraction
    const tickets = safeDataAccess(rawData, []);
    const pagination = rawData?.pagination || null;
    const hasValidData = validateApiResponse(rawData);

    return {
        tickets,
        pagination,
        hasValidData,
        error,
        isLoading,
        isError,
        isFetching,
        refetch,
        // Additional helper methods
        isEmpty: tickets.length === 0,
        totalCount: pagination?.total || 0,
    };
};

export default {
    safeDataMap,
    safeDataAccess,
    validateApiResponse,
    createSafeProvidesTags,
    createWebSocketConnection,
    createSafeApiSlice,
    useSafeTicketData,
};
