import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    HelpCircle,
    MessageSquare,
    AlertCircle,
    Calendar,
    X,
    Send,
    ChevronRight,
    CheckCircle,
    Clock,
    Zap
} from 'lucide-react';
import { SupportTicketStatus } from '../../types/support';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../pages/auth/store/authSlice';
import {
    useGetUserTicketsQuery,
    useGetTicketByIdQuery,
    useCreateTicketMutation,
    useAddTicketCommentMutation,
    useUpdateTicketStatusMutation,
    TicketCategory
} from '../../services/supportTicketsApi';

interface NewTicketFormData {
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    booking_id?: string;
    vehicle_id?: string;
}

const SupportPage: React.FC = () => {
    const location = useLocation();
    const currentUser = useSelector(selectCurrentUser);

    // RTK Query hooks
    const {
        data: ticketsData,
        isLoading,
        error,
        refetch
    } = useGetUserTicketsQuery({});

    const [createTicket, { isLoading: isCreatingTicket }] = useCreateTicketMutation();
    const [addComment, { isLoading: isAddingComment }] = useAddTicketCommentMutation();
    const [updateTicketStatus] = useUpdateTicketStatusMutation();

    // State
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [isNewTicketFormOpen, setIsNewTicketFormOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [newTicketForm, setNewTicketForm] = useState<NewTicketFormData>({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'general',
        booking_id: '',
        vehicle_id: ''
    });

    const [newReply, setNewReply] = useState('');

    // Get active ticket details
    const {
        data: activeTicket,
        isLoading: isLoadingTicketDetails
    } = useGetTicketByIdQuery(activeTicketId!, {
        skip: !activeTicketId
    });

    const tickets = ticketsData?.data || [];

    // Initialize form data from location state
    React.useEffect(() => {
        if (location.state?.bookingId || location.state?.subject || location.state?.vehicleId) {
            setNewTicketForm(prev => ({
                ...prev,
                subject: location.state?.subject || '',
                booking_id: location.state?.bookingId || '',
                vehicle_id: location.state?.vehicleId || ''
            }));
            setIsNewTicketFormOpen(true);
        }
    }, [location.state]);

    // Handle new ticket form changes
    const handleNewTicketChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewTicketForm(prev => ({ ...prev, [name]: value }));
    };

    // Submit new support ticket
    const handleNewTicketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const result = await createTicket({
                subject: newTicketForm.subject,
                description: newTicketForm.description,
                priority: newTicketForm.priority,
                category: newTicketForm.category as TicketCategory,
                ...(newTicketForm.booking_id && { booking_id: newTicketForm.booking_id }),
                ...(newTicketForm.vehicle_id && { vehicle_id: newTicketForm.vehicle_id })
            }).unwrap();

            toast.success('Support ticket created successfully');
            setIsNewTicketFormOpen(false);
            setNewTicketForm({
                subject: '',
                description: '',
                priority: 'medium',
                category: 'general',
                booking_id: '',
                vehicle_id: ''
            });

            // Select the newly created ticket
            setActiveTicketId(result.ticket_id);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create support ticket');
        }
    };

    // Submit reply to an existing ticket
    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeTicketId || !newReply.trim()) return;

        try {
            await addComment({
                ticketId: activeTicketId,
                message: newReply
            }).unwrap();

            setNewReply('');
            toast.success('Reply sent successfully');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to send reply');
        }
    };

    // Handle ticket closure
    const handleCloseTicket = async () => {
        if (!activeTicketId) return;

        try {
            await updateTicketStatus({
                ticketId: activeTicketId,
                status: 'closed'
            }).unwrap();

            toast.success('Ticket closed successfully');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to close ticket');
        }
    };

    // Format date strings to readable format
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get ticket status badge styling
    const getStatusBadgeStyle = (status: SupportTicketStatus) => {
        switch (status) {
            case 'open':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'closed':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'resolved':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Get ticket priority badge styling
    const getPriorityBadgeStyle = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Filter tickets by search query
    const filteredTickets = tickets.filter((ticket: any) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
            ticket.subject.toLowerCase().includes(query) ||
            ticket.ticket_id.toLowerCase().includes(query) ||
            ticket.status.toLowerCase().includes(query) ||
            (ticket.category && ticket.category.toLowerCase().includes(query))
        );
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Center</h1>
                <p className="text-gray-600">Get help from our support team</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Tickets List */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900">My Tickets</h2>
                            <button
                                onClick={() => setIsNewTicketFormOpen(true)}
                                className="inline-flex items-center px-3 py-1 bg-blue-600 border border-transparent rounded-md text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                New Ticket
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-6 py-4 border-b border-gray-100">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search tickets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                        </div>

                        {/* Tickets List */}
                        <div className="h-[calc(100vh-300px)] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                                    <p className="text-gray-600 text-sm">Loading tickets...</p>
                                </div>
                            ) : error ? (
                                <div className="p-6 text-center">
                                    <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                                    <p className="text-red-600 text-sm">Failed to load tickets</p>
                                    <button
                                        onClick={() => refetch()}
                                        className="mt-3 text-blue-600 text-sm hover:underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="p-6 text-center">
                                    <MessageSquare className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                    <p className="text-gray-500 text-sm">
                                        {searchQuery ? "No tickets match your search." : "You haven't created any support tickets yet."}
                                    </p>
                                    <button
                                        onClick={() => setIsNewTicketFormOpen(true)}
                                        className="mt-3 text-blue-600 text-sm hover:underline"
                                    >
                                        Create a new ticket
                                    </button>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    <AnimatePresence>
                                        {filteredTickets.map((ticket: any) => (
                                            <motion.li
                                                key={ticket.ticket_id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeTicketId === ticket.ticket_id ? 'bg-blue-50' : ''}`}
                                                onClick={() => setActiveTicketId(ticket.ticket_id)}
                                            >
                                                <div className="px-6 py-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {ticket.description.substring(0, 60)}
                                                                {ticket.description.length > 60 ? '...' : ''}
                                                            </p>
                                                            <div className="flex items-center mt-2">
                                                                <span className={`px-2 py-1 inline-flex text-xs leading-none font-medium ${getStatusBadgeStyle(ticket.status)} rounded-full capitalize`}>
                                                                    {ticket.status.replace('_', ' ')}
                                                                </span>
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    {new Date(ticket.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                                                    </div>
                                                </div>
                                            </motion.li>
                                        ))}
                                    </AnimatePresence>
                                </ul>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Right Column - Ticket Details or New Ticket Form */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2"
                >
                    <AnimatePresence mode="wait">
                        {isNewTicketFormOpen ? (
                            <motion.div
                                key="new-ticket-form"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden"
                            >
                                <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                                    <h2 className="font-bold text-gray-900 flex items-center">
                                        <Plus className="w-5 h-5 mr-2 text-blue-600" />
                                        Create New Support Ticket
                                    </h2>
                                    <button
                                        onClick={() => setIsNewTicketFormOpen(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <form onSubmit={handleNewTicketSubmit}>
                                        <div className="space-y-6">
                                            {/* Subject */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Subject *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="subject"
                                                    value={newTicketForm.subject}
                                                    onChange={handleNewTicketChange}
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Brief description of your issue"
                                                />
                                            </div>

                                            {/* Category and Priority Row */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Category *
                                                    </label>
                                                    <select
                                                        name="category"
                                                        value={newTicketForm.category}
                                                        onChange={handleNewTicketChange}
                                                        required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    >
                                                        <option value="general">General Inquiry</option>
                                                        <option value="booking">Booking Issue</option>
                                                        <option value="payment">Payment Problem</option>
                                                        <option value="vehicle">Vehicle Question</option>
                                                        <option value="account">Account Management</option>
                                                        <option value="technical">Technical Support</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Priority *
                                                    </label>
                                                    <select
                                                        name="priority"
                                                        value={newTicketForm.priority}
                                                        onChange={handleNewTicketChange}
                                                        required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="high">High</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Related Information Row */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Related Booking ID (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="booking_id"
                                                        value={newTicketForm.booking_id || ''}
                                                        onChange={handleNewTicketChange}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Enter booking ID if applicable"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Related Vehicle ID (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="vehicle_id"
                                                        value={newTicketForm.vehicle_id || ''}
                                                        onChange={handleNewTicketChange}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Enter vehicle ID if applicable"
                                                    />
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Description *
                                                </label>
                                                <textarea
                                                    name="description"
                                                    value={newTicketForm.description}
                                                    onChange={handleNewTicketChange}
                                                    required
                                                    rows={6}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                    placeholder="Please describe your issue in detail..."
                                                ></textarea>
                                            </div>

                                            {/* Submit Button */}
                                            <div className="flex justify-end space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsNewTicketFormOpen(false)}
                                                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isCreatingTicket}
                                                    className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                                                >
                                                    {isCreatingTicket ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="mr-2 h-4 w-4" />
                                                            Submit Ticket
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        ) : activeTicket ? (
                            <motion.div
                                key="ticket-details"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden"
                            >
                                {/* Ticket Header */}
                                <div className="border-b border-gray-100 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-bold text-gray-900">{activeTicket.subject}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-none font-medium ${getStatusBadgeStyle(activeTicket.status)} rounded-full capitalize`}>
                                                {activeTicket.status === 'open' && <Clock className="w-3 h-3 mr-1" />}
                                                {activeTicket.status === 'in_progress' && <Zap className="w-3 h-3 mr-1" />}
                                                {activeTicket.status === 'closed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                {activeTicket.status.replace('_', ' ')}
                                            </span>
                                            <span className={`px-2 py-1 inline-flex text-xs leading-none font-medium ${getPriorityBadgeStyle(activeTicket.priority)} rounded-full capitalize`}>
                                                {activeTicket.priority}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500 mt-2">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        <span>Created on {formatDate(activeTicket.created_at)}</span>
                                    </div>

                                    {/* Ticket Info */}
                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
                                        <div>
                                            <span className="text-gray-500">Ticket ID:</span>
                                            <span className="ml-2 font-medium font-mono text-xs">{activeTicket.ticket_id}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Category:</span>
                                            <span className="ml-2 font-medium capitalize">{activeTicket.category || 'General'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments/Messages */}
                                <div className="p-6 h-[calc(100vh-400px)] overflow-y-auto">
                                    {isLoadingTicketDetails ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Show the initial ticket description */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex"
                                            >
                                                <div className="max-w-[80%] bg-gray-100 text-gray-800 rounded-lg p-4">
                                                    <div className="flex items-center mb-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold mr-2">
                                                            {currentUser?.firstname?.[0]}{currentUser?.lastname?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">You</p>
                                                            <p className="text-xs text-gray-500">
                                                                {formatDate(activeTicket.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm whitespace-pre-wrap">{activeTicket.description}</p>
                                                </div>
                                            </motion.div>

                                            {/* Show comments if available */}
                                            <AnimatePresence>
                                                {activeTicket.comments && activeTicket.comments.map((comment, index) => (
                                                    <motion.div
                                                        key={comment.comment_id || index}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className={`flex ${comment.user_id === (currentUser as any)?.user_id || comment.user_id === (currentUser as any)?.id ? 'justify-end' : ''}`}
                                                    >
                                                        <div className={`max-w-[80%] ${comment.user_id === (currentUser as any)?.user_id || comment.user_id === (currentUser as any)?.id
                                                            ? 'bg-blue-100 text-gray-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            } rounded-lg p-4`}>
                                                            <div className="flex items-center mb-2">
                                                                {comment.user_id !== (currentUser as any)?.user_id && comment.user_id !== (currentUser as any)?.id && (
                                                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold mr-2">
                                                                        CS
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="text-sm font-medium">
                                                                        {(comment.user_id === (currentUser as any)?.user_id || comment.user_id === (currentUser as any)?.id) ? 'You' : 'Support Agent'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {formatDate(comment.created_at)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>

                                {/* Reply Form */}
                                {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
                                    <div className="border-t border-gray-100 p-6">
                                        <form onSubmit={handleReplySubmit}>
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-grow">
                                                    <textarea
                                                        value={newReply}
                                                        onChange={(e) => setNewReply(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                        rows={3}
                                                        placeholder="Type your reply here..."
                                                        required
                                                    ></textarea>
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={!newReply.trim() || isAddingComment}
                                                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 self-end"
                                                >
                                                    {isAddingComment ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    ) : (
                                                        <Send className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Ticket Actions */}
                                {(activeTicket.status === 'open' || activeTicket.status === 'in_progress') && (
                                    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleCloseTicket}
                                                className="inline-flex items-center px-4 py-2 bg-gray-200 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                Close Ticket
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty-state"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden flex flex-col items-center justify-center py-16"
                            >
                                <HelpCircle className="h-16 w-16 text-gray-300 mb-4" />
                                <h3 className="text-xl font-medium text-gray-700 mb-2">Support Center</h3>
                                <p className="text-gray-500 text-center max-w-md mb-6">
                                    Select a ticket to view its details or create a new support ticket to get help from our team.
                                </p>
                                <button
                                    onClick={() => setIsNewTicketFormOpen(true)}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Ticket
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default SupportPage;