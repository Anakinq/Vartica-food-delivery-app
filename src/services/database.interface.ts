export interface DatabaseError {
  message: string;
  code?: string;
}

export interface QueryResult<T> {
  data: T | null;
  error: DatabaseError | null;
}

export interface InsertParams<T> {
  table: string;
  data: Partial<T> | Partial<T>[];
}

export interface UpdateParams<T> {
  table: string;
  data: Partial<T>;
  match: Record<string, unknown>;
}

export interface SelectParams {
  table: string;
  columns?: string;
  match?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

export interface DeleteParams {
  table: string;
  match: Record<string, unknown>;
}

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export interface RealtimeCallback<T> {
  (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T;
    old: T;
  }): void;
}

export interface IDatabaseService {
  select<T>(params: SelectParams): Promise<QueryResult<T[]>>;
  selectSingle<T>(params: SelectParams): Promise<QueryResult<T>>;
  insert<T>(params: InsertParams<T>): Promise<QueryResult<T[]>>;
  update<T>(params: UpdateParams<T>): Promise<QueryResult<T[]>>;
  delete(params: DeleteParams): Promise<QueryResult<null>>;
  subscribe<T>(
    table: string,
    callback: RealtimeCallback<T>,
    filter?: Record<string, unknown>
  ): RealtimeSubscription;
}
