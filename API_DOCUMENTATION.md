# Vartica Food Delivery App - API Documentation

## Base URL
```
https://vartica-food-delivery-app.vercel.app/api
```

## Authentication
All API endpoints require authentication through Supabase. Use the standard Supabase authentication flow.

## Error Handling
All API responses follow this structure:
```json
{
  "success": boolean,
  "data": object | null,
  "error": {
    "message": string,
    "code": string
  } | null
}
```

## Rate Limiting
- Limit: 100 requests per 15 minutes per IP
- Response: 429 Too Many Requests when exceeded

## Endpoints

### 1. User Management

#### GET `/api/user/profile`
Get current user profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "customer",
    "avatar_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT `/api/user/profile`
Update user profile information.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+1234567890",
  "avatar_url": "https://..."
}
```

### 2. Vendor Management

#### GET `/api/vendors`
Get list of all vendors.

**Query Parameters:**
- `category`: Filter by category
- `search`: Search by name
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendor-id",
        "name": "Vendor Name",
        "description": "Vendor description",
        "image_url": "https://...",
        "rating": 4.5,
        "delivery_time": "30-45 min",
        "delivery_fee": 500,
        "is_open": true,
        "categories": ["category1", "category2"]
      }
    ],
    "total": 100,
    "has_more": true
  }
}
```

#### GET `/api/vendors/{id}`
Get specific vendor details.

### 3. Order Management

#### POST `/api/orders`
Create a new order.

**Request Body:**
```json
{
  "vendor_id": "vendor-id",
  "items": [
    {
      "menu_item_id": "item-id",
      "quantity": 2,
      "special_instructions": "No onions"
    }
  ],
  "delivery_address": {
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "postal_code": "12345"
  },
  "payment_method": "paystack"
}
```

#### GET `/api/orders`
Get user's order history.

**Query Parameters:**
- `status`: Filter by status (pending, confirmed, preparing, out_for_delivery, delivered, cancelled)
- `limit`: Number of results
- `offset`: Pagination offset

#### GET `/api/orders/{id}`
Get specific order details.

### 4. Payment Integration

#### POST `/api/payments/initialize`
Initialize a payment transaction.

**Request Body:**
```json
{
  "amount": 5000,
  "email": "customer@example.com",
  "order_id": "order-id",
  "metadata": {
    "custom_fields": [
      {
        "display_name": "Order ID",
        "variable_name": "order_id",
        "value": "order-id"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.co/...",
    "access_code": "access-code",
    "reference": "transaction-reference"
  }
}
```

#### POST `/api/payments/verify`
Verify payment completion.

**Request Body:**
```json
{
  "reference": "transaction-reference"
}
```

### 5. Chat & Communication

#### GET `/api/chat/messages/{order_id}`
Get chat messages for an order.

#### POST `/api/chat/messages`
Send a new message.

**Request Body:**
```json
{
  "order_id": "order-id",
  "message": "Hello, when will my order arrive?",
  "file_url": "https://.../image.jpg",
  "file_type": "image/jpeg"
}
```

### 6. Wallet & Withdrawals

#### GET `/api/wallet/balance`
Get user's wallet balance.

#### POST `/api/wallet/withdraw`
Request withdrawal.

**Request Body:**
```json
{
  "amount": 5000,
  "bank_account": {
    "account_number": "1234567890",
    "bank_code": "044",
    "account_name": "John Doe"
  }
}
```

### 7. Analytics & Reporting

#### GET `/api/analytics/dashboard`
Get dashboard analytics for vendors/admins.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_orders": 150,
    "total_revenue": 75000,
    "avg_rating": 4.3,
    "recent_orders": [...],
    "popular_items": [...]
  }
}
```

## Webhooks

### Paystack Webhook
**Endpoint:** `/api/webhooks/paystack`

Handles payment confirmation and order status updates.

### Order Status Updates
**Endpoint:** `/api/webhooks/order-status`

Receives real-time order status updates from delivery agents.

## Security

### Authentication
- All endpoints require valid Supabase JWT token
- Tokens must be included in Authorization header: `Bearer {token}`

### CORS
- Allowed origins: `https://vartica-food-delivery-app.vercel.app`
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Requested-With

### Content Security Policy
Refer to security headers implementation in `src/utils/security.ts`

## Rate Limiting Response
When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "message": "Too Many Requests",
    "code": "RATE_LIMIT_EXCEEDED"
  },
  "reset_time": 1703123456789
}
```

## Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `AUTH_ERROR`: Authentication failed
- `NOT_FOUND`: Resource not found
- `PERMISSION_DENIED`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Contact
For API support and questions, contact the development team.