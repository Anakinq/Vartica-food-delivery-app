# Vartica - Campus Food Delivery App

A modern, progressive web app (PWA) for university campus food delivery connecting students with cafeterias, vendors, and late-night food options.

## 🚀 Features

### For Students (Customers)
- Browse food from multiple campus cafeterias and vendors
- Real-time menu updates and availability
- Secure Paystack payments
- Order tracking and notifications
- Wallet system for easy payments
- Dark mode support

### For Vendors & Cafeterias
- Vendor dashboard for menu management
- Order management system
- Revenue analytics and reporting
- Customizable business hours
- Student vendor verification system

### For Delivery Agents
- Delivery dashboard for order management
- Real-time location tracking
- Earnings tracking
- Route optimization

### Admin Features
- User management and role assignment
- Vendor approval system
- System analytics and monitoring
- Payment reconciliation

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **React Router** - Client-side routing

### Backend & Infrastructure
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication (Email, OAuth)
  - Real-time subscriptions
  - Storage for images
- **Paystack** - Payment processing
- **Vercel** - Deployment and hosting

### PWA Features
- Installable on mobile devices
- Offline capability
- App-like experience
- Push notifications ready
- Desktop-first layout with mobile scaling

## 📱 PWA Implementation

This app uses a **desktop-layout power with app-like vibes** approach:

- Fixed 1200px viewport width scaled appropriately for mobile
- Standalone display mode (no browser chrome)
- Dark theme optimized for app experience
- Pinch-to-zoom capability preserved
- Install prompt for better user experience

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd vartica-food-delivery-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```
   
   Required environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   ```

4. **Database Setup:**
   - Run the SQL migrations in `supabase/migrations/`
   - Execute the fix scripts for role assignments:
     - `fix_oauth_delivery_agent.sql`
     - `supabase_fix_trigger_safe.sql`

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

6. **Build for Production:**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── admin/          # Admin dashboard components
│   ├── auth/           # Authentication components
│   ├── cafeteria/      # Cafeteria dashboard
│   ├── customer/       # Customer-facing components
│   ├── delivery/       # Delivery agent components
│   ├── shared/         # Shared components
│   └── vendor/         # Vendor dashboard
├── contexts/           # React contexts (Auth, Toast)
├── lib/                # Utility libraries
├── services/           # API services
├── types/              # TypeScript types
└── utils/              # Helper functions
supabase/
├── functions/          # Edge functions
├── migrations/         # Database migrations
└── config.toml         # Supabase configuration
```

## 🔐 Authentication

Supports multiple authentication methods:
- Email/Password signup
- Google OAuth
- Role-based access control
- Automatic profile creation based on signup role

## 💳 Payment System

- Integrated Paystack payment gateway
- Secure webhook handling
- Wallet system for students
- Payment splitting for vendors

## 🎨 UI/UX Features

- Responsive design with mobile-first approach
- Dark/light mode toggle
- Smooth animations and transitions
- Accessibility compliant
- Touch-optimized interface
- Custom toast notifications

## 🚚 Delivery Management

- Real-time delivery tracking
- Location updates for delivery agents
- Order status management
- Route optimization suggestions

## 📊 Analytics & Reporting

- Sales analytics for vendors
- Order tracking and insights
- User engagement metrics
- Revenue reporting

## 🛡️ Security

- Input validation and sanitization
- Rate limiting for API calls
- Secure authentication flows
- Database transaction safety
- Payment webhook verification

## 📱 Progressive Web App

### Key PWA Features:
- Installable on home screen
- Works offline with service worker
- App-like navigation and experience
- Push notifications support
- Desktop-first layout with mobile scaling

### Viewport Configuration:
- Fixed 1200px width for desktop experience
- Scaled appropriately on mobile devices
- Maintains desktop layout integrity
- User-scalable for accessibility

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript compilation check
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on pushes to main branch

### Manual Deployment
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## 📋 Environment Variables

Create `.env` file with:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Paystack
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Optional
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues & Fixes

### OAuth Role Assignment
Fixed issues with delivery agent OAuth signups creating customer accounts:
- `fix_oauth_delivery_agent.sql` - Database trigger fixes
- `DeliveryAgentUpgradeModal.tsx` - UI upgrade component

### Database Migrations
Apply all SQL scripts in `supabase/migrations/` in numerical order for proper setup.

## 📚 Documentation

- [Setup Guide](SETUP_GUIDE.md)
- [How to Use](HOW_TO_USE.md)
- [API Documentation](docs/api.md)
- [Database Schema](docs/schema.md)

## 📞 Support

For support, email support@vartica.app or join our Discord community.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [Paystack](https://paystack.com) - Payment processing
- [Vercel](https://vercel.com) - Hosting and deployment
- [Tailwind CSS](https://tailwindcss.com) - Styling framework
- All the amazing open-source contributors
