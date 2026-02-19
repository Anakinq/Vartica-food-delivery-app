import { supabase } from '../../lib/supabase/client';
import {
  IDatabaseService,
  SelectParams,
  InsertParams,
  UpdateParams,
  DeleteParams,
  QueryResult,
  RealtimeCallback,
} from '../database.interface';
import { Profile, Vendor, DeliveryAgent } from '../../lib/supabase';
import { retryOperation, DATABASE_RETRY_OPTIONS } from '../../utils/retry';

// Enhanced types for real-time vendor data
export interface ProfileWithVendor extends Profile {
  vendor?: Vendor | null;
  vendor_status?: {
    is_active: boolean;
    application_status: string;
  } | null;
  delivery_agent?: DeliveryAgent | null;
}

class SupabaseDatabaseService implements IDatabaseService {
  async select<T>(params: SelectParams): Promise<QueryResult<T[]>> {
    return retryOperation(async () => {
      let query = supabase.from(params.table).select(params.columns || '*');

      if (params.match) {
        Object.entries(params.match).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (params.order) {
        query = query.order(params.order.column, { ascending: params.order.ascending ?? true });
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      return {
        data: data as T[] | null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    }, DATABASE_RETRY_OPTIONS);
  }

  async selectSingle<T>(params: SelectParams): Promise<QueryResult<T>> {
    return retryOperation(async () => {
      let query = supabase.from(params.table).select(params.columns || '*');

      if (params.match) {
        Object.entries(params.match).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query.maybeSingle();

      return {
        data: data as T | null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    }, DATABASE_RETRY_OPTIONS);
  }

  async insert<T>(params: InsertParams<T>): Promise<QueryResult<T[]>> {
    try {
      const { data, error } = await supabase
        .from(params.table)
        .insert(params.data as never)
        .select();

      return {
        data: data as T[] | null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message },
      };
    }
  }

  async update<T>(params: UpdateParams<T>): Promise<QueryResult<T[]>> {
    try {
      let query = supabase.from(params.table).update(params.data as never);

      Object.entries(params.match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.select();

      return {
        data: data as T[] | null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message },
      };
    }
  }

  async delete(params: DeleteParams): Promise<QueryResult<null>> {
    try {
      let query = supabase.from(params.table).delete();

      Object.entries(params.match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { error } = await query;

      return {
        data: null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message },
      };
    }
  }

  subscribe<T>(
    table: string,
    callback: RealtimeCallback<T>,
    filter?: Record<string, unknown>
  ) {
    let channel = supabase.channel(`${table}-changes`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter
          ? Object.entries(filter)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join(',')
          : undefined,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as T,
          old: payload.old as T,
        });
      }
    );

    channel.subscribe();

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      },
    };
  }

  // Enhanced real-time subscription for profile + vendor data
  subscribeProfileWithVendor(
    userId: string,
    callback: (profile: ProfileWithVendor | null, error?: Error) => void
  ) {
    try {
      console.log('Setting up profile+vendor subscription for user:', userId);

      // Subscribe to profile changes
      const profileSubscription = this.subscribe<Profile>(
        'profiles',
        (payload) => {
          if (payload.new?.id === userId) {
            console.log('Profile change detected for user:', userId);
            this.fetchProfileWithVendor(userId)
              .then(result => {
                if (result.error) {
                  console.error('Error fetching updated profile for user', userId, ':', result.error);
                  callback(null, new Error(result.error.message));
                } else {
                  console.log('Successfully fetched updated profile for user:', userId);
                  callback(result.data);
                }
              })
              .catch(err => {
                console.error('Error in profile subscription callback for user', userId, ':', err);
                callback(null, err);
              });
          }
        },
        { id: userId }
      );

      // Subscribe to vendor changes for this user
      const vendorSubscription = this.subscribe<Vendor>(
        'vendors',
        (payload) => {
          if (payload.new?.user_id === userId) {
            console.log('Vendor change detected for user:', userId);
            this.fetchProfileWithVendor(userId)
              .then(result => {
                if (result.error) {
                  console.error('Error fetching updated vendor data for user', userId, ':', result.error);
                  callback(null, new Error(result.error.message));
                } else {
                  console.log('Successfully fetched updated vendor data for user:', userId);
                  callback(result.data);
                }
              })
              .catch(err => {
                console.error('Error in vendor subscription callback for user', userId, ':', err);
                callback(null, err);
              });
          }
        },
        { user_id: userId }
      );

      // Subscribe to delivery agent changes for delivery agents
      const deliveryAgentSubscription = this.subscribe<any>(
        'delivery_agents',
        (payload) => {
          if (payload.new?.user_id === userId) {
            console.log('Delivery agent change detected for user:', userId);
            this.fetchProfileWithVendor(userId)
              .then(result => {
                if (result.error) {
                  console.error('Error fetching updated delivery agent data for user', userId, ':', result.error);
                  callback(null, new Error(result.error.message));
                } else {
                  console.log('Successfully fetched updated delivery agent data for user:', userId);
                  callback(result.data);
                }
              })
              .catch(err => {
                console.error('Error in delivery agent subscription callback for user', userId, ':', err);
                callback(null, err);
              });
          }
        },
        { user_id: userId }
      );

      console.log('Profile+vendor subscription successfully set up for user:', userId);

      return {
        unsubscribe: () => {
          try {
            console.log('Unsubscribing from profile+vendor+delivery changes for user:', userId);
            profileSubscription.unsubscribe();
            vendorSubscription.unsubscribe();
            deliveryAgentSubscription.unsubscribe();
            console.log('Successfully unsubscribed from profile+vendor+delivery changes for user:', userId);
          } catch (err) {
            console.error('Error unsubscribing from profile+vendor+delivery changes for user', userId, ':', err);
          }
        }
      };
    } catch (err) {
      console.error('Error setting up profile+vendor subscription for user', userId, ':', err);
      throw err;
    }
  };

  // Enhanced profile fetching with improved caching and cache invalidation
  async fetchProfileWithVendor(userId: string): Promise<QueryResult<ProfileWithVendor>> {
    try {
      console.log('Fetching profile with vendor data for user:', userId);

      // Check if this is a role switching operation that requires fresh data
      const roleSwitching = sessionStorage.getItem('role_switching_operation');
      const cacheKey = `profile_with_vendor_${userId}`;

      // Clear cache if we're switching roles
      if (roleSwitching) {
        console.log('Role switching detected, bypassing cache for user:', userId);
        sessionStorage.removeItem(cacheKey);
      }

      // Check cache (5-minute TTL) only if not switching roles
      if (!roleSwitching) {
        const cachedResult = sessionStorage.getItem(cacheKey);
        if (cachedResult) {
          try {
            const parsedCache = JSON.parse(cachedResult);
            // Cache for 5 minutes
            if (Date.now() - parsedCache.timestamp < 5 * 60 * 1000) {
              console.log('Returning cached profile with vendor data for user:', userId);
              return { data: parsedCache.data, error: null };
            } else {
              // Cache expired, remove it
              sessionStorage.removeItem(cacheKey);
            }
          } catch (cacheError) {
            console.warn('Cache parsing error, clearing cache:', cacheError);
            sessionStorage.removeItem(cacheKey);
          }
        }
      }

      // Fetch profile data with proper error handling
      const profileResult = await this.selectSingle<Profile>({
        table: 'profiles',
        match: { id: userId }
      });

      if (profileResult.error) {
        console.error('Profile fetch error for user', userId, ':', profileResult.error);
        // Try to get basic user info from auth as fallback
        return await this.createProfileFallback(userId);
      }

      if (!profileResult.data) {
        console.log('No profile data found for user:', userId);
        return { data: null, error: null };
      }

      const profileData = profileResult.data;
      console.log('Raw profile data for user', userId, ':', profileData);

      // Fetch related data in parallel for better performance
      const [vendorData, deliveryAgentData] = await Promise.all([
        this.fetchVendorData(userId, profileData),
        this.fetchDeliveryAgentData(userId, profileData)
      ]);

      // Create profile with all related data
      const profileWithVendor: ProfileWithVendor = {
        ...profileData,
        vendor: vendorData,
        vendor_status: vendorData ? {
          is_active: vendorData.is_active ?? false,
          application_status: vendorData.application_status || 'pending'
        } : null,
        delivery_agent: deliveryAgentData
      };

      console.log('Final profile+vendor data for user', userId, ':', profileWithVendor);

      // Cache the result (only if not switching roles)
      if (!roleSwitching) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: profileWithVendor,
          timestamp: Date.now()
        }));
      }

      // Clean up role switching markers
      if (roleSwitching) {
        sessionStorage.removeItem('role_switching_operation');
      }

      return {
        data: profileWithVendor,
        error: null
      };
    } catch (err) {
      console.error('Error in fetchProfileWithVendor for user', userId, ':', err);
      if (err instanceof Error) {
        console.error('Error details:', err.name, err.message, err.stack);
      }
      return {
        data: null,
        error: { message: (err as Error).message }
      };
    }
  }

  // Helper method to fetch vendor data
  private async fetchVendorData(userId: string, profileData: any) {
    try {
      // Check if user has vendor capabilities
      const isVendor = profileData.is_vendor || ['vendor', 'late_night_vendor'].includes(profileData.role);
      if (!isVendor) {
        return null;
      }

      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (vendorError) {
        console.warn('Vendor fetch error for user', userId, ':', vendorError);
        return null;
      }

      return vendorData;
    } catch (error) {
      console.warn('Vendor query exception for user', userId, ':', error);
      return null;
    }
  }

  // Helper method to fetch delivery agent data
  private async fetchDeliveryAgentData(userId: string, profileData: any) {
    try {
      // Check if user has delivery agent capabilities
      const isDeliveryAgent = profileData.is_delivery_agent || profileData.role === 'delivery_agent';
      if (!isDeliveryAgent) {
        return null;
      }

      const { data: agentData, error: agentError } = await supabase
        .from('delivery_agents')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (agentError) {
        console.warn('Delivery agent fetch error for user', userId, ':', agentError);
        return null;
      }

      return agentData;
    } catch (error) {
      console.warn('Delivery agent query exception for user', userId, ':', error);
      return null;
    }
  }

  // Helper method to create profile fallback from auth data
  private async createProfileFallback(userId: string): Promise<QueryResult<ProfileWithVendor>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        const basicProfile: any = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          role: 'customer',
          phone: user.user_metadata?.phone || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          hostel_location: user.user_metadata?.hostel_location || null,
          hostel: null,
          matric_number: null,
          department: null,
          vendor_approved: false,
          delivery_approved: false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Created basic profile from auth data for user:', userId);
        return { data: basicProfile, error: null };
      }
    } catch (authError) {
      console.error('Auth fallback failed:', authError);
    }

    return {
      data: null,
      error: { message: 'Failed to fetch profile data', code: 'PROFILE_FETCH_FAILED' }
    };
  }

  // Method to clear profile cache for a specific user
  clearProfileCache(userId: string) {
    const cacheKey = `profile_with_vendor_${userId}`;
    sessionStorage.removeItem(cacheKey);
    console.log('Cleared profile cache for user:', userId);
  }

  // Method to clear all profile caches
  clearAllProfileCaches() {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('profile_with_vendor_')) {
        sessionStorage.removeItem(key);
      }
    });
    console.log('Cleared all profile caches');
  }

  async getPendingApprovals() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        vendor_approved,
        delivery_approved,
        created_at
      `)
      .or('vendor_approved.is.null,delivery_approved.is.null')
      .in('role', ['vendor', 'late_night_vendor', 'delivery_agent'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }

    return { data, error: null };
  }

  async updateApproval(userId: string, role: 'vendor' | 'delivery_agent', approved: boolean, adminId?: string) {
    if (role === 'vendor' && adminId) {
      // For vendor approvals, use the dedicated review function
      // First, get the vendor ID from the user ID
      const { data: vendorData, error: vendorFetchError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (vendorFetchError) {
        console.error('Error fetching vendor record:', vendorFetchError);
        // Fall back to direct update
        const updateData = { vendor_approved: approved };
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (error) {
          console.error('Error updating approval in profiles:', error);
          throw error;
        }

        // Update the vendor's is_active status based on approval status
        const { error: vendorError } = await supabase
          .from('vendors')
          .update({
            is_active: approved,
            application_status: approved ? 'approved' : 'rejected'
          })
          .eq('user_id', userId);

        if (vendorError) {
          console.error('Error updating vendor active status:', vendorError);
          throw vendorError;
        }
      } else if (vendorData && vendorData.id) {
        // Use the RPC function for proper vendor application review
        const { error: rpcError } = await supabase.rpc('review_vendor_application', {
          p_vendor_id: vendorData.id,
          p_action: approved ? 'approve' : 'reject',
          p_reviewer_id: adminId,
        });

        if (rpcError) {
          console.error('Error using review_vendor_application RPC:', rpcError);
          throw rpcError;
        }
      }
    } else if (role === 'delivery_agent') {
      // For delivery agents, update both profile and delivery_agents table
      const updateData = { delivery_approved: approved };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Error updating approval in profiles:', error);
        throw error;
      }

      // Also update the delivery_agents table
      const { error: agentError } = await supabase
        .from('delivery_agents')
        .update({ is_approved: approved })
        .eq('user_id', userId);

      if (agentError) {
        console.error('Error updating is_approved in delivery_agents:', agentError);
        // Don't throw here - the profile update succeeded
      }
    } else {
      // For general cases where adminId is not provided
      let updateData = {};
      if (role === 'vendor') {
        updateData = { vendor_approved: approved };
      } else if (role === 'delivery_agent') {
        updateData = { delivery_approved: approved };
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Error updating approval:', error);
        throw error;
      }

      // Update the vendor's is_active status based on approval status
      if (role === 'vendor') {
        const { error: vendorError } = await supabase
          .from('vendors')
          .update({
            is_active: approved,
            application_status: approved ? 'approved' : 'rejected'
          })
          .eq('user_id', userId);

        if (vendorError) {
          console.error('Error updating vendor active status:', vendorError);
          throw vendorError;
        }
      }
    }

    return { success: true, error: null };
  }

  async getVendorStatus(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('vendor_approved')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching vendor status:', error);
      throw error;
    }

    return { data, error: null };
  }

  // Enhanced vendor status with real-time capability
  async getVendorStatusWithRealtime(userId: string, callback?: (status: boolean | null) => void) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('vendor_approved, vendors!user_id(is_active, application_status)')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching vendor status with realtime:', error);
        throw error;
      }

      if (!data) {
        callback?.(null);
        return { data: null, error: null };
      }

      // Extract vendor status from either profile or vendor record
      const profileApproved = data.vendor_approved;
      const vendorArray = data.vendors;
      const vendorData = vendorArray && Array.isArray(vendorArray)
        ? vendorArray[0]
        : vendorArray;

      const vendorActive = vendorData && typeof vendorData === 'object' ? (vendorData as any).is_active ?? false : false;
      const vendorStatus = vendorData && typeof vendorData === 'object' ? (vendorData as any).application_status || 'pending' : 'pending';

      // Vendor is considered "approved" if either:
      // 1. Profile has vendor_approved = true, OR
      // 2. Vendor record exists and is active
      const isApproved = profileApproved === true || (vendorData && vendorActive);

      callback?.(isApproved);

      return {
        data: {
          approved: isApproved,
          profile_approved: profileApproved,
          vendor_active: vendorActive,
          vendor_status: vendorStatus
        },
        error: null
      };
    } catch (err) {
      console.error('Error in getVendorStatusWithRealtime:', err);
      callback?.(null);
      return { data: null, error: err as Error };
    }
  }

  async getDeliveryAgentStatus(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('delivery_approved')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching delivery agent status:', error);
      throw error;
    }

    return { data, error: null };
  }

  // Add location tracking methods
  async updateOrderLocation(orderId: string, location: { latitude: number; longitude: number; timestamp?: string; accuracy?: number }) {
    const locationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp || new Date().toISOString(),
      accuracy: location.accuracy
    };

    const { error } = await supabase
      .from('orders')
      .update({ delivery_agent_location: locationData })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating delivery agent location:', error);
      throw error;
    }

    return { success: true, error: null };
  }

  async getDeliveryAgentLocation(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('delivery_agent_location')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching delivery agent location:', error);
      throw error;
    }

    return { data, error: null };
  }

  async getCustomerLocation(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('customer_location')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching customer location:', error);
      throw error;
    }

    return { data, error: null };
  }

  // Helper function to check approval status
  async checkApprovalStatus(userId: string, role: string) {
    try {
      if (role === 'vendor') {
        // For vendors, check both profile approval and vendor application status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('vendor_approved')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error checking profile approval status:', profileError);
        }

        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('application_status, is_active')
          .eq('user_id', userId)
          .maybeSingle();

        if (vendorError) {
          console.error('Error checking vendor application status:', vendorError);
        }

        // Vendor is approved if:
        // 1. Profile has vendor_approved = true, OR
        // 2. Vendor record exists with application_status = 'approved' and is_active = true
        const profileApproved = profileData?.vendor_approved ?? false;
        const vendorApproved = vendorData?.application_status === 'approved' && vendorData?.is_active === true;

        console.log(`[Approval Check] User ${userId}: profileApproved=${profileApproved}, vendorApproved=${vendorApproved}`);

        return profileApproved || vendorApproved;
      } else if (role === 'delivery_agent') {
        const { data, error } = await supabase
          .from('profiles')
          .select('delivery_approved')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error checking delivery agent approval status:', error);
          return null;
        }

        return data.delivery_approved ?? null;
      }

      return null;
    } catch (error) {
      console.error('Error in checkApprovalStatus:', error);
      return null;
    }
  }
}

export const databaseService = new SupabaseDatabaseService();

// Helper function to check approval status
export const checkApprovalStatus = async (userId: string, role: string) => {
  try {
    if (role === 'vendor') {
      // For vendors, check both profile approval and vendor application status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('vendor_approved')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error checking profile approval status:', profileError);
      }

      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('application_status, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (vendorError) {
        console.error('Error checking vendor application status:', vendorError);
      }

      // Vendor is approved if:
      // 1. Profile has vendor_approved = true, OR
      // 2. Vendor record exists with application_status = 'approved' and is_active = true
      const profileApproved = profileData?.vendor_approved ?? false;
      const vendorApproved = vendorData?.application_status === 'approved' && vendorData?.is_active === true;

      console.log(`[Approval Check] User ${userId}: profileApproved=${profileApproved}, vendorApproved=${vendorApproved}`);

      return profileApproved || vendorApproved;
    } else if (role === 'delivery_agent') {
      const { data, error } = await supabase
        .from('profiles')
        .select('delivery_approved')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking delivery agent approval status:', error);
        return null;
      }

      return data.delivery_approved ?? null;
    }

    return null;
  } catch (error) {
    console.error('Error in checkApprovalStatus:', error);
    return null;
  }
};
