import React, { useState } from 'react';
import { Menu, X, ChefHat, Users, Bike, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onRoleSelect: (role: 'customer' | 'cafeteria' | 'vendor' | 'late_night_vendor' | 'delivery_agent' | 'admin') => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const LandingPage: React.FC<LandingPageProps> = ({ onRoleSelect }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const roles = [
    {
      id: 'cafeteria' as const,
      title: 'Cafeteria',
      icon: ChefHat,
      description: 'Sign in to manage your cafeteria menu',
      color: 'bg-blue-500',
    },
    {
      id: 'vendor' as const,
      title: 'Student Vendors',
      icon: Users,
      description: 'Sign up or sign in to start selling',
      color: 'bg-emerald-500',
    },
    {
      id: 'late_night_vendor' as const,
      title: 'Late Night Vendors',
      icon: UtensilsCrossed,
      description: 'Sign up or sign in for late-night food',
      color: 'bg-purple-600',
    },
    {
      id: 'delivery_agent' as const,
      title: 'Delivery Agents',
      icon: Bike,
      description: 'Join our delivery network',
      color: 'bg-amber-500',
    },
    {
      id: 'admin' as const,
      title: 'Admin',
      icon: ShieldCheck,
      description: 'System administration',
      color: 'bg-rose-500',
    },
  ];

  // Food icons for background pattern
  const foodIcons = [
    { icon: ChefHat, x: '10%', y: '15%', size: 'text-2xl', opacity: 'opacity-20', color: 'text-white' },
    { icon: UtensilsCrossed, x: '20%', y: '70%', size: 'text-3xl', opacity: 'opacity-15', color: 'text-amber-200' },
    { icon: Users, x: '80%', y: '25%', size: 'text-xl', opacity: 'opacity-20', color: 'text-blue-100' },
    { icon: Bike, x: '90%', y: '80%', size: 'text-2xl', opacity: 'opacity-15', color: 'text-white' },
    { icon: ShieldCheck, x: '50%', y: '50%', size: 'text-xl', opacity: 'opacity-15', color: 'text-blue-200' },
    { icon: ChefHat, x: '70%', y: '10%', size: 'text-xl', opacity: 'opacity-20', color: 'text-amber-100' },
    { icon: UtensilsCrossed, x: '30%', y: '85%', size: 'text-2xl', opacity: 'opacity-20', color: 'text-white' },
    { icon: Users, x: '5%', y: '40%', size: 'text-3xl', opacity: 'opacity-15', color: 'text-blue-200' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 relative overflow-hidden before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI0IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjE1Ii8+PGNpcmRsZSBjeD0iOTAiIGN5PSIyMCIgcj0iMyIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iODAiIHI9IjUiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMTUiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjcwIiByPSIyIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjE1Ii8+PGNpcmNsZSBjeD0iODAiIGN5PSI1MCIgcj0iNCIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPjxwYXRoIGQ9Ik0zNSAzNUw0MCA0MEw0NSAzNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMTUiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik02NSA2NUw3MCA3MEw3NSA2NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMTUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==')] before:bg-repeat before:opacity-30 before:z-0">
      {/* Food-themed background pattern */}
      <div className="absolute inset-0">
        {foodIcons.map((food, index) => {
          const IconComponent = food.icon;
          return (
            <div 
              key={index}
              className={`absolute ${food.x} ${food.y} ${food.size} ${food.opacity} ${food.color}`}
            >
              <IconComponent />
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0">
        {/* Simple food illustration pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI0IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48Y2lyY2xlIGN4PSI5MCIgY3k9IjIwIiByPSIzIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjgwIiByPSI1IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjcwIiByPSIyIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48Y2lyY2xlIGN4PSI4MCIgY3k9IjUwIiByPSI0IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] bg-repeat opacity-30"></div>
      </div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <nav className="bg-white/90 backdrop-blur-sm shadow-md fixed w-full top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <UtensilsCrossed className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">Vartica</span>
              </div>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <div className="hidden lg:flex space-x-4">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => onRoleSelect(role.id)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-white hover:bg-blue-500 rounded-md transition-colors"
                  >
                    {role.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {menuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      onRoleSelect(role.id);
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-white hover:bg-blue-500 rounded-md transition-colors"
                  >
                    {role.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Welcome to Vartica
              </h1>
              <p className="text-lg sm:text-xl text-gray-100 max-w-2xl mx-auto px-2">
                Your campus food delivery solution connecting students with cafeterias,
                student vendors, and late-night food options
              </p>
            </motion.div>

            {/* Order Button */}
            <motion.div
              className="mb-16"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <button
                onClick={() => onRoleSelect('customer')}
                className="w-full max-w-md mx-auto block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-xl text-lg sm:text-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.99]"
              >
                Order Food Now
              </button>
            </motion.div>

            {/* Role Cards */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6 mb-16"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <motion.div
                    key={role.id}
                    variants={item}
                    whileHover={{ y: -8 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => onRoleSelect(role.id)}
                      className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all p-5 sm:p-6 text-left group w-full"
                    >
                      <div className={`${role.color} w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{role.title}</h3>
                      <p className="text-gray-600 text-sm sm:text-base">{role.description}</p>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Stats */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="inline-flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-gray-100">
                <div className="flex flex-col items-center">
                  <div className="text-3xl sm:text-4xl font-bold text-blue-400">7</div>
                  <div className="text-sm sm:text-base">Cafeterias</div>
                </div>
                <div className="w-px h-8 sm:h-10 bg-gray-400"></div>
                <div className="flex flex-col items-center">
                  <div className="text-3xl sm:text-4xl font-bold text-emerald-400">100+</div>
                  <div className="text-sm sm:text-base">Student Vendors</div>
                </div>
                <div className="w-px h-8 sm:h-10 bg-gray-400"></div>
                <div className="flex flex-col items-center">
                  <div className="text-3xl sm:text-4xl font-bold text-amber-400">24/7</div>
                  <div className="text-sm sm:text-base">Late Night</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};