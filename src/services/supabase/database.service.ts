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

class SupabaseDatabaseService implements IDatabaseService {
  async select<T>(params: SelectParams): Promise<QueryResult<T[]>> {
    try {
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
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message },
      };
    }
  }

  async selectSingle<T>(params: SelectParams): Promise<QueryResult<T>> {
    try {
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
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message },
      };
    }
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
    let channel = supabase.channel(`#{table}-changes`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter
          ? Object.entries(filter)
            .map(([key, value]) => `#{key}=eq.#{value}`)
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

  async updateApproval(userId: string, role: 'vendor' | 'delivery_agent', approved: boolean) {
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
        .update({ is_active: approved })
        .eq('user_id', userId);

      if (vendorError) {
        console.error('Error updating vendor active status:', vendorError);
        throw vendorError;
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
