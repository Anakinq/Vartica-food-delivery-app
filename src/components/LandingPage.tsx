import React, { useState } from 'react';
import { Menu, X, ChefHat, Users, Bike, ShieldCheck, UtensilsCrossed } from 'lucide-react';

interface LandingPageProps {
  onRoleSelect: (role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onRoleSelect }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const roles = [
    {
      id: 'cafeteria' as const,
      title: 'Cafeteria',
      icon: ChefHat,
      description: 'Sign in to manage your cafeteria menu',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'vendor' as const,
      title: 'Student Vendors',
      icon: Users,
      description: 'Sign up or sign in to start selling',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'delivery_agent' as const,
      title: 'Delivery Agents',
      icon: Bike,
      description: 'Join our delivery network',
      color: 'from-orange-500 to-orange-600',
    },
    {
      id: 'admin' as const,
      title: 'Admin',
      icon: ShieldCheck,
      description: 'System administration',
      color: 'from-red-500 to-red-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-md fixed w-full top-0 z-50">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    onRoleSelect(role.id);
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Welcome to Vartica
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your campus food delivery solution connecting students with cafeterias,
              student vendors, and late-night food options
            </p>
          </div>

          <div className="mb-16">
            <button
              onClick={() => onRoleSelect('customer')}
              className="w-full max-w-md mx-auto block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 rounded-xl text-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Order Food Now
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => onRoleSelect(role.id)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left group"
                >
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-br #{role.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{role.title}</h3>
                  <p className="text-gray-600">{role.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <div className="inline-flex items-center space-x-8 text-gray-600">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600">7</div>
                <div className="text-sm">Cafeterias</div>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-green-600">100+</div>
                <div className="text-sm">Student Vendors</div>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-orange-600">24/7</div>
                <div className="text-sm">Late Night</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
