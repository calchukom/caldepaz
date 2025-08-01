import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../store/hooks';
import { selectCurrentUser, updateUser } from '../../pages/auth/store/authSlice';
import {
    User,
    Calendar,
    MapPin,
    Shield,
    Camera,
    Upload,
    Bell,
    Globe,
    Lock,
    Activity,
    Settings,
    AlertCircle,
    Check
} from 'lucide-react';

interface ProfileFormData {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    avatar_url?: string;
    bio?: string;
    website?: string;
    linkedin?: string;
    twitter?: string;
}

interface PasswordFormData {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

interface NotificationSettings {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    booking_reminders: boolean;
    payment_alerts: boolean;
}

interface PrivacySettings {
    profile_visibility: 'public' | 'private' | 'limited';
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
}

type TabType = 'profile' | 'security' | 'notifications' | 'privacy';

const ProfilePage: React.FC = () => {
    const dispatch = useAppDispatch();
    const currentUser = useSelector(selectCurrentUser);

    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [, setUploadingAvatar] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

    const [profileForm, setProfileForm] = useState<ProfileFormData>({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        avatar_url: '',
        bio: '',
        website: '',
        linkedin: '',
        twitter: ''
    });

    const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        marketing_emails: false,
        booking_reminders: true,
        payment_alerts: true
    });

    const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
        profile_visibility: 'public',
        show_email: false,
        show_phone: false,
        show_address: false
    });

    // Load user data
    useEffect(() => {
        if (currentUser) {
            setProfileForm({
                firstname: currentUser.firstname || '',
                lastname: currentUser.lastname || '',
                email: currentUser.email || '',
                phone: currentUser.contact_phone || '',
                address_line1: currentUser.address || '',
                address_line2: '',
                city: '',
                state: '',
                postal_code: '',
                country: '',
                avatar_url: '',
                bio: '',
                website: '',
                linkedin: '',
                twitter: ''
            });
        }
    }, [currentUser]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!profileForm.firstname.trim()) {
            newErrors.firstname = 'First name is required';
        }

        if (!profileForm.lastname.trim()) {
            newErrors.lastname = 'Last name is required';
        }

        if (!profileForm.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (profileForm.phone && !/^\+?[\d\s\-\(\)]+$/.test(profileForm.phone)) {
            newErrors.phone = 'Phone number is invalid';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePasswordForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!passwordForm.current_password) {
            newErrors.current_password = 'Current password is required';
        }

        if (!passwordForm.new_password) {
            newErrors.new_password = 'New password is required';
        } else if (passwordForm.new_password.length < 8) {
            newErrors.new_password = 'Password must be at least 8 characters long';
        }

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            newErrors.confirm_password = 'Passwords do not match';
        }

        setPasswordErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const userData = {
                firstname: profileForm.firstname,
                lastname: profileForm.lastname,
                email: profileForm.email,
                contact_phone: profileForm.phone,
                address: profileForm.address_line1
            };

            dispatch(updateUser(userData));
            toast.success('Profile updated successfully');
        } catch (error: any) {
            console.error('Profile update failed:', error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validatePasswordForm()) {
            return;
        }

        setPasswordLoading(true);
        try {
            // Here you would implement the password change API call
            console.log('Changing password...');
            // await changePassword(passwordForm);

            toast.success('Password updated successfully');
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
        } catch (error: any) {
            console.error('Password change failed:', error);
            toast.error(error.message || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Handle avatar upload
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            // Here you would implement the actual avatar upload logic
            // For now, we'll just create a preview URL
            const previewUrl = URL.createObjectURL(file);
            setProfileForm(prev => ({ ...prev, avatar_url: previewUrl }));

            // In a real implementation, you would upload to your backend/cloud storage
            // const uploadedUrl = await uploadToCloudinary(file);
            // setProfileForm(prev => ({ ...prev, avatar_url: uploadedUrl }));
        } catch (error) {
            console.error('Avatar upload failed:', error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Handle notification settings update
    const handleNotificationUpdate = async () => {
        try {
            // Here you would save notification settings to your backend
            console.log('Saving notification settings:', notificationSettings);
            // await updateNotificationSettings(notificationSettings);
            toast.success('Notification preferences updated');
        } catch (error) {
            console.error('Failed to update notification settings:', error);
            toast.error('Failed to update notification settings');
        }
    };

    // Handle privacy settings update
    const handlePrivacyUpdate = async () => {
        try {
            // Here you would save privacy settings to your backend
            console.log('Saving privacy settings:', privacySettings);
            // await updatePrivacySettings(privacySettings);
            toast.success('Privacy settings updated');
        } catch (error) {
            console.error('Failed to update privacy settings:', error);
            toast.error('Failed to update privacy settings');
        }
    };

    // Tab Components
    const ProfileInformationTab = () => (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="text-blue-600" size={24} />
                Personal Information
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="firstname" className="block text-sm font-medium text-gray-700 mb-2">
                            First Name
                        </label>
                        <input
                            type="text"
                            id="firstname"
                            name="firstname"
                            value={profileForm.firstname}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                        {errors.firstname && <p className="text-sm text-red-600 mt-1">{errors.firstname}</p>}
                    </div>

                    <div>
                        <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name
                        </label>
                        <input
                            type="text"
                            id="lastname"
                            name="lastname"
                            value={profileForm.lastname}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                        {errors.lastname && <p className="text-sm text-red-600 mt-1">{errors.lastname}</p>}
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={profileForm.email}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={profileForm.phone}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                    </div>
                </div>

                <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                        Biography
                    </label>
                    <textarea
                        id="bio"
                        name="bio"
                        value={profileForm.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="textarea textarea-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Tell us about yourself..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                            <Globe size={16} className="inline mr-1" />
                            Website
                        </label>
                        <input
                            type="url"
                            id="website"
                            name="website"
                            value={profileForm.website}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://your-website.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-2">
                            LinkedIn
                        </label>
                        <input
                            type="url"
                            id="linkedin"
                            name="linkedin"
                            value={profileForm.linkedin}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://linkedin.com/in/username"
                        />
                    </div>

                    <div>
                        <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-2">
                            Twitter
                        </label>
                        <input
                            type="url"
                            id="twitter"
                            name="twitter"
                            value={profileForm.twitter}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://twitter.com/username"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary px-8 hover:shadow-lg transition-all duration-200"
                    >
                        {loading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Updating...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Address Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="text-blue-600" size={20} />
                    Address Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-2">
                            Address Line 1
                        </label>
                        <input
                            type="text"
                            id="address_line1"
                            name="address_line1"
                            value={profileForm.address_line1}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-2">
                            Address Line 2
                        </label>
                        <input
                            type="text"
                            id="address_line2"
                            name="address_line2"
                            value={profileForm.address_line2}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                            City
                        </label>
                        <input
                            type="text"
                            id="city"
                            name="city"
                            value={profileForm.city}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                            State/Province
                        </label>
                        <input
                            type="text"
                            id="state"
                            name="state"
                            value={profileForm.state}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                            Postal Code
                        </label>
                        <input
                            type="text"
                            id="postal_code"
                            name="postal_code"
                            value={profileForm.postal_code}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                            Country
                        </label>
                        <input
                            type="text"
                            id="country"
                            name="country"
                            value={profileForm.country}
                            onChange={handleInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const SecurityTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Shield className="text-blue-600" size={24} />
                    Security Settings
                </h2>

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className="alert alert-info bg-blue-50 border-blue-200">
                        <AlertCircle className="text-blue-600" size={20} />
                        <span className="text-blue-800">
                            Keep your account secure by using a strong password and updating it regularly.
                        </span>
                    </div>

                    <div>
                        <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                        </label>
                        <input
                            type="password"
                            id="current_password"
                            name="current_password"
                            value={passwordForm.current_password}
                            onChange={handlePasswordInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                        {passwordErrors.current_password && (
                            <p className="text-sm text-red-600 mt-1">{passwordErrors.current_password}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                        </label>
                        <input
                            type="password"
                            id="new_password"
                            name="new_password"
                            value={passwordForm.new_password}
                            onChange={handlePasswordInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                        {passwordErrors.new_password && (
                            <p className="text-sm text-red-600 mt-1">{passwordErrors.new_password}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            id="confirm_password"
                            name="confirm_password"
                            value={passwordForm.confirm_password}
                            onChange={handlePasswordInputChange}
                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                        {passwordErrors.confirm_password && (
                            <p className="text-sm text-red-600 mt-1">{passwordErrors.confirm_password}</p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="btn btn-primary px-8 hover:shadow-lg transition-all duration-200"
                        >
                            {passwordLoading ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Lock size={18} />
                                    Update Password
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Account Activity */}
            <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="text-blue-600" size={20} />
                    Recent Activity
                </h3>

                <div className="space-y-3">
                    {[
                        { action: 'Password changed', time: '2 days ago', status: 'success' },
                        { action: 'Profile updated', time: '1 week ago', status: 'info' },
                        { action: 'Login from new device', time: '2 weeks ago', status: 'warning' }
                    ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900">{activity.action}</span>
                            <span className="text-sm text-gray-500">{activity.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const NotificationsTab = () => (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="text-blue-600" size={24} />
                Notification Preferences
            </h2>

            <div className="space-y-6">
                <div className="alert alert-info bg-blue-50 border-blue-200">
                    <AlertCircle className="text-blue-600" size={20} />
                    <span className="text-blue-800">
                        Customize how you receive notifications to stay informed about your bookings and account activity.
                    </span>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Email Notifications</h3>
                            <p className="text-sm text-gray-500">Receive important updates via email</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={notificationSettings.email_notifications}
                            onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                email_notifications: e.target.checked
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                            <p className="text-sm text-gray-500">Get instant alerts via text message</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={notificationSettings.sms_notifications}
                            onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                sms_notifications: e.target.checked
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Push Notifications</h3>
                            <p className="text-sm text-gray-500">Browser notifications for real-time updates</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={notificationSettings.push_notifications}
                            onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                push_notifications: e.target.checked
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Marketing Emails</h3>
                            <p className="text-sm text-gray-500">Special offers and promotional content</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={notificationSettings.marketing_emails}
                            onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                marketing_emails: e.target.checked
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Booking Reminders</h3>
                            <p className="text-sm text-gray-500">Reminders about upcoming reservations</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={notificationSettings.booking_reminders}
                            onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                booking_reminders: e.target.checked
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Payment Alerts</h3>
                            <p className="text-sm text-gray-500">Notifications about payment confirmations and failures</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={notificationSettings.payment_alerts}
                            onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                payment_alerts: e.target.checked
                            })}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleNotificationUpdate}
                        className="btn btn-primary px-8 hover:shadow-lg transition-all duration-200"
                    >
                        <Check size={18} />
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );

    const PrivacyTab = () => (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="text-blue-600" size={24} />
                Privacy Settings
            </h2>

            <div className="space-y-6">
                <div className="alert alert-warning bg-yellow-50 border-yellow-200">
                    <AlertCircle className="text-yellow-600" size={20} />
                    <span className="text-yellow-800">
                        These settings control what information is visible to other users and administrators.
                    </span>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Profile Visibility</h3>
                            <p className="text-sm text-gray-500">Make your profile visible to other users</p>
                        </div>
                        <select
                            className="select select-bordered"
                            value={privacySettings.profile_visibility}
                            onChange={(e) => setPrivacySettings({
                                ...privacySettings,
                                profile_visibility: e.target.value as 'public' | 'private' | 'limited'
                            })}
                        >
                            <option value="public">Public</option>
                            <option value="limited">Limited</option>
                            <option value="private">Private</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Show Email Address</h3>
                            <p className="text-sm text-gray-500">Display your email in your public profile</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={privacySettings.show_email}
                            onChange={(e) => setPrivacySettings({
                                ...privacySettings,
                                show_email: e.target.checked
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Show Phone Number</h3>
                            <p className="text-sm text-gray-500">Display your phone number in your profile</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={privacySettings.show_phone}
                            onChange={(e) => setPrivacySettings({
                                ...privacySettings,
                                show_phone: e.target.checked
                            })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900">Show Address</h3>
                            <p className="text-sm text-gray-500">Display your address information</p>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={privacySettings.show_address}
                            onChange={(e) => setPrivacySettings({
                                ...privacySettings,
                                show_address: e.target.checked
                            })}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handlePrivacyUpdate}
                        className="btn btn-primary px-8 hover:shadow-lg transition-all duration-200"
                    >
                        <Check size={18} />
                        Save Privacy Settings
                    </button>
                </div>

                {/* Data Management */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="text-blue-600" size={20} />
                        Data Management
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-900">Export Your Data</h4>
                                <p className="text-sm text-gray-500">Download a copy of all your account data</p>
                            </div>
                            <button className="btn btn-outline btn-sm">
                                <Upload size={16} />
                                Export Data
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                            <div>
                                <h4 className="font-medium text-red-900">Delete Account</h4>
                                <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                            </div>
                            <button className="btn btn-error btn-sm">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Enhanced Header */}
                <div className="mb-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    {profileForm.avatar_url ? (
                                        <img
                                            src={profileForm.avatar_url}
                                            alt="Profile"
                                            className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold border-4 border-white/20">
                                            {profileForm.firstname?.[0]}{profileForm.lastname?.[0]}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => document.getElementById('avatar-upload')?.click()}
                                        className="absolute -bottom-2 -right-2 bg-white text-blue-600 p-2 rounded-full shadow-lg hover:bg-blue-50 transition-colors"
                                    >
                                        <Camera size={16} />
                                    </button>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                    />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">
                                        {profileForm.firstname} {profileForm.lastname}
                                    </h1>
                                    <p className="text-blue-100 mt-1">{profileForm.email}</p>
                                    <div className="flex items-center gap-2 mt-2 text-blue-100">
                                        <Calendar size={16} />
                                        <span className="text-sm">
                                            Member since {new Date(currentUser?.created_at || Date.now()).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6">
                            {[
                                { id: 'profile', label: 'Profile Information', icon: User },
                                { id: 'security', label: 'Security', icon: Shield },
                                { id: 'notifications', label: 'Notifications', icon: Bell },
                                { id: 'privacy', label: 'Privacy', icon: Lock }
                            ].map((tab) => {
                                const IconComponent = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <IconComponent size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {activeTab === 'profile' && <ProfileInformationTab />}
                    {activeTab === 'security' && <SecurityTab />}
                    {activeTab === 'notifications' && <NotificationsTab />}
                    {activeTab === 'privacy' && <PrivacyTab />}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
