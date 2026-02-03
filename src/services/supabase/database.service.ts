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
import { Profile, Vendor } from '../../lib/supabase';
import { retryOperation, DATABASE_RETRY_OPTIONS } from '../../utils/retry';

// Enhanced types for real-time vendor data
export interface ProfileWithVendor extends Profile {
  vendor?: Vendor | null;
  vendor_status?: {
    is_active: boolean;
    application_status: string;
  } | null;
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

      console.log('Profile+vendor subscription successfully set up for user:', userId);

      return {
        unsubscribe: () => {
          try {
            console.log('Unsubscribing from profile+vendor changes for user:', userId);
            profileSubscription.unsubscribe();
            vendorSubscription.unsubscribe();
            console.log('Successfully unsubscribed from profile+vendor changes for user:', userId);
          } catch (err) {
            console.error('Error unsubscribing from profile+vendor changes for user', userId, ':', err);
          }
        }
      };
    } catch (err) {
      console.error('Error setting up profile+vendor subscription for user', userId, ':', err);
      throw err;
    }
  };

  // Consolidated fetch for profile + vendor data with error handling
  async fetchProfileWithVendor(userId: string): Promise<QueryResult<ProfileWithVendor>> {
    try {
      console.log('Fetching profile with vendor data for user:', userId);

      // Use a cache to avoid repeated API calls for the same user
      const cacheKey = `profile_with_vendor_${userId}`;
      const cachedResult = sessionStorage.getItem(cacheKey);

      if (cachedResult) {
        try {
          const parsedCache = JSON.parse(cachedResult);
          // Cache for 5 minutes
          if (Date.now() - parsedCache.timestamp < 5 * 60 * 1000) {
            console.log('Returning cached profile with vendor data for user:', userId);
            return { data: parsedCache.data, error: null };
          }
        } catch (cacheError) {
          console.warn('Cache parsing error:', cacheError);
        }
      }

      // First fetch the profile separately to avoid join issues
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error for user', userId, ':', profileError);
        // Try to get basic user info from auth if profile fails
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === userId) {
            // Create minimal profile from auth data
            const basicProfile: any = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
              role: 'customer',
              phone: user.user_metadata?.phone || null,
              avatar_url: user.user_metadata?.avatar_url || null,
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
          error: { message: profileError.message || 'Profile fetch error', code: profileError.code || 'PROFILE_ERROR' }
        };
      }

      if (!profileData) {
        console.log('No profile data found for user:', userId);
        return {
          data: null,
          error: null
        };
      }

      console.log('Raw profile data for user', userId, ':', profileData);

      // Fetch vendor data separately to avoid join issues
      let vendorData = null;
      try {
        const { data: vendorDataResult, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (vendorError) {
          console.warn('Vendor fetch error for user', userId, ':', vendorError);
          // Don't fail completely, continue with profile only
        } else {
          vendorData = vendorDataResult;
        }
      } catch (vendorQueryError) {
        console.warn('Vendor query exception for user', userId, ':', vendorQueryError);
        // Continue with profile only
      }

      console.log('Vendor data for user', userId, ':', vendorData);

      // Create profile with vendor data, ensuring type compatibility
      const profileWithVendor: ProfileWithVendor = {
        ...profileData,
        vendor: vendorData ? {
          id: vendorData.id,
          user_id: profileData.id,
          store_name: vendorData.store_name,
          description: vendorData.description,
          image_url: vendorData.image_url,
          vendor_type: vendorData.vendor_type,
          is_active: vendorData.is_active,
          available_from: vendorData.available_from,
          available_until: vendorData.available_until,
          created_at: vendorData.created_at,
          location: vendorData.location,
          matric_number: vendorData.matric_number,
          department: vendorData.department,
          delivery_option: vendorData.delivery_option,
          application_status: vendorData.application_status,
          application_submitted_at: vendorData.application_submitted_at,
          application_reviewed_at: vendorData.application_reviewed_at,
          rejection_reason: vendorData.rejection_reason
        } : null,
        vendor_status: vendorData && typeof vendorData === 'object' ? {
          is_active: (vendorData as any).is_active ?? false,
          application_status: (vendorData as any).application_status || 'pending'
        } : null
      };

      console.log('Final profile+vendor data for user', userId, ':', profileWithVendor);

      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: profileWithVendor,
        timestamp: Date.now()
      }));

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
      .in('role', ['vendor', 'late_night_vendor'])
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
      // For delivery agents, use the existing logic
      const updateData = { delivery_approved: approved };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Error updating approval:', error);
        throw error;
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
}

export const databaseService = new SupabaseDatabaseService();

// Helper function to check approval status
export const checkApprovalStatus = async (userId: string, role: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('vendor_approved, delivery_approved')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking approval status:', error);
      return null;
    }

    if (role === 'vendor') {
      return data.vendor_approved ?? null;
    } else if (role === 'delivery_agent') {
      return data.delivery_approved ?? null;
    }

    return null;
  } catch (error) {
    console.error('Error in checkApprovalStatus:', error);
    return null;
  }
};
