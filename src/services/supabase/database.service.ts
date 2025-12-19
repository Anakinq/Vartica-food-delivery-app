import { supabase } from '../../lib/supabase';
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
}

export const databaseService = new SupabaseDatabaseService();
