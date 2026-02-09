// src/services/notification.service.ts
import { supabase } from '../lib/supabase/client';

interface NotificationData {
    userId: string;
    title: string;
    message: string;
    type: 'sms' | 'email' | 'push';
    recipient: string;
}

class NotificationService {
    // Send notification via Supabase functions or external services
    async sendNotification(data: NotificationData): Promise<boolean> {
        try {
            // In a real implementation, this would integrate with an SMS/Email service like:
            // - Twilio for SMS
            // - SendGrid/Mailgun for Email
            // - Supabase functions for server-side processing

            console.log(`Sending ${data.type} notification to ${data.recipient}:`, data.message);

            // For now, we'll log the notification and return success
            // In a production environment, you would call your SMS/Email service here
            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }

    // Send order status update notification
    async sendOrderStatusUpdate(orderId: string, userId: string, status: string): Promise<boolean> {
        try {
            // Fetch user profile to get contact information
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', userId)
                .single();

            if (profileError || !profile) {
                console.error('Error fetching user profile:', profileError);
                return false;
            }

            // Create status-specific message
            let message = '';
            let title = 'Order Update';

            switch (status) {
                case 'pending':
                    message = `Your order has been placed successfully. Order ID: ${orderId}`;
                    break;
                case 'accepted':
                    message = `Your order has been accepted by the vendor. Order ID: ${orderId}`;
                    break;
                case 'preparing':
                    message = `Your order is being prepared. Order ID: ${orderId}`;
                    break;
                case 'ready':
                    message = `Your order is ready for pickup. Order ID: ${orderId}`;
                    break;
                case 'picked_up':
                    message = `Your order has been picked up by the delivery agent. Order ID: ${orderId}`;
                    break;
                case 'delivered':
                    message = `Your order has been delivered successfully. Order ID: ${orderId}`;
                    break;
                case 'cancelled':
                    message = `Your order has been cancelled. Order ID: ${orderId}`;
                    break;
                default:
                    message = `Your order status has been updated to ${status}. Order ID: ${orderId}`;
            }

            // Send email notification
            if (profile.email) {
                const emailResult = await this.sendNotification({
                    userId,
                    title,
                    message,
                    type: 'email',
                    recipient: profile.email
                });

                if (!emailResult) {
                    console.error('Failed to send email notification');
                }
            }

            // Send SMS notification if phone number exists
            if (profile.phone) {
                const smsResult = await this.sendNotification({
                    userId,
                    title,
                    message,
                    type: 'sms',
                    recipient: profile.phone
                });

                if (!smsResult) {
                    console.error('Failed to send SMS notification');
                }
            }

            return true;
        } catch (error) {
            console.error('Error sending order status notification:', error);
            return false;
        }
    }

    // Send notification to vendor about new order
    async sendVendorOrderNotification(orderId: string, vendorId: string): Promise<boolean> {
        try {
            // Fetch vendor profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', vendorId)
                .single();

            if (profileError || !profile) {
                console.error('Error fetching vendor profile:', profileError);
                return false;
            }

            const message = `New order received. Order ID: ${orderId}. Please check your dashboard to view details.`;
            const title = 'New Order';

            // Send email notification
            if (profile.email) {
                const emailResult = await this.sendNotification({
                    userId: vendorId,
                    title,
                    message,
                    type: 'email',
                    recipient: profile.email
                });

                if (!emailResult) {
                    console.error('Failed to send vendor email notification');
                }
            }

            // Send SMS notification if phone number exists
            if (profile.phone) {
                const smsResult = await this.sendNotification({
                    userId: vendorId,
                    title,
                    message,
                    type: 'sms',
                    recipient: profile.phone
                });

                if (!smsResult) {
                    console.error('Failed to send vendor SMS notification');
                }
            }

            return true;
        } catch (error) {
            console.error('Error sending vendor order notification:', error);
            return false;
        }
    }

    // Send notification to delivery agent about assigned order
    async sendDeliveryAgentNotification(orderId: string, agentId: string): Promise<boolean> {
        try {
            // Fetch delivery agent profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', agentId)
                .single();

            if (profileError || !profile) {
                console.error('Error fetching delivery agent profile:', profileError);
                return false;
            }

            const message = `New order assigned to you. Order ID: ${orderId}. Please check your dashboard to view details and pickup location.`;
            const title = 'New Delivery Assignment';

            // Send email notification
            if (profile.email) {
                const emailResult = await this.sendNotification({
                    userId: agentId,
                    title,
                    message,
                    type: 'email',
                    recipient: profile.email
                });

                if (!emailResult) {
                    console.error('Failed to send delivery agent email notification');
                }
            }

            // Send SMS notification if phone number exists
            if (profile.phone) {
                const smsResult = await this.sendNotification({
                    userId: agentId,
                    title,
                    message,
                    type: 'sms',
                    recipient: profile.phone
                });

                if (!smsResult) {
                    console.error('Failed to send delivery agent SMS notification');
                }
            }

            return true;
        } catch (error) {
            console.error('Error sending delivery agent notification:', error);
            return false;
        }
    }

    // Send chat message notification
    async sendMessageNotification(orderNumber: string, userId: string, message: string): Promise<boolean> {
        try {
            // Fetch user profile to get contact information
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', userId)
                .single();

            if (profileError || !profile) {
                console.error('Error fetching user profile:', profileError);
                return false;
            }

            const title = 'New Message';
            const fullMessage = `New message on Order #${orderNumber}: ${message}`;

            // Send email notification
            if (profile.email) {
                await this.sendNotification({
                    userId,
                    title,
                    message: fullMessage,
                    type: 'email',
                    recipient: profile.email
                });
            }

            // Send SMS notification if phone number exists
            if (profile.phone) {
                await this.sendNotification({
                    userId,
                    title,
                    message: fullMessage,
                    type: 'sms',
                    recipient: profile.phone
                });
            }

            return true;
        } catch (error) {
            console.error('Error sending message notification:', error);
            return false;
        }
    }

    // Send notification when a new delivery agent registers
    async sendDeliveryAgentRegistrationNotification(
        userId: string,
        agentId: string,
        vehicleType: string
    ): Promise<boolean> {
        try {
            // Fetch user profile to get contact information
            const { data: userProfile, error: userError } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', userId)
                .single();

            if (userError || !userProfile) {
                console.error('Error fetching user profile:', userError);
                return false;
            }

            const title = 'New Delivery Agent Registration';
            const message = `${userProfile.full_name || 'A user'} has registered as a delivery agent (${vehicleType}). Pending approval. Agent ID: ${agentId}`;

            // Log the notification
            console.log('[Notification] Delivery Agent Registration:', {
                userId,
                agentId,
                vehicleType,
                userName: userProfile.full_name
            });

            // Notify all admins about the new delivery agent registration
            const { data: admins, error: adminError } = await supabase
                .from('profiles')
                .select('id, email, phone')
                .eq('role', 'admin');

            if (adminError) {
                console.error('Error fetching admins:', adminError);
            } else if (admins && admins.length > 0) {
                for (const admin of admins) {
                    // Send email notification to admin
                    if (admin.email) {
                        await this.sendNotification({
                            userId: admin.id,
                            title,
                            message,
                            type: 'email',
                            recipient: admin.email
                        });
                    }

                    // Send SMS notification to admin if available
                    if (admin.phone) {
                        await this.sendNotification({
                            userId: admin.id,
                            title,
                            message,
                            type: 'sms',
                            recipient: admin.phone
                        });
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Error sending delivery agent registration notification:', error);
            return false;
        }
    }
}

export const notificationService = new NotificationService();