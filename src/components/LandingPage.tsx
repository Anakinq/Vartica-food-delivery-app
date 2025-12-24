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

  // Food images for the carousel
  const foodImages = [
    '/images/1.jpg',
    '/images/2.jpg',
    '/images/3.jpg',
    '/images/4.jpg',
    '/images/5.jpg',
    '/images/6.jpg',
    '/images/7.jpg',
    '/images/1.jpg',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="h-8 w-8 text-amber-600" />
              <span className="text-xl font-bold text-gray-900">Vartica</span>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="hidden md:flex space-x-4">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => onRoleSelect(role.id)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    onRoleSelect(role.id);
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section with Food Carousel */}
      <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 overflow-hidden">
        {/* Food Image Carousel */}
        <div className="absolute inset-0 opacity-20">
          <div className="relative w-full h-full">
            {foodImages.map((image, index) => (
              <div
                key={index}
                className="food-carousel-slide absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${image})`,
                  display: index === 0 ? 'block' : 'none'
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
              Campus Food Delivery
            </h1>
            <p className="text-xl md:text-2xl text-amber-100 max-w-3xl mx-auto mb-10">
              Order from cafeterias, student vendors, and late-night options delivered right to your doorstep
            </p>
            <button
              onClick={() => onRoleSelect('customer')}
              className="bg-white text-amber-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-amber-50 transition-all transform hover:scale-105 shadow-lg"
            >
              Order Food Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Vartica?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of students enjoying convenient campus food delivery
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition-shadow transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <UtensilsCrossed className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Wide Selection</h3>
            <p className="text-gray-600">From cafeterias to student vendors, find exactly what you're craving</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition-shadow transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bike className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Fast Delivery</h3>
            <p className="text-gray-600">Quick and reliable delivery right to your doorstep</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition-shadow transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ChefHat className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Quality Food</h3>
            <p className="text-gray-600">Fresh, delicious meals from trusted campus vendors</p>
          </div>
        </div>
      </div>

      {/* Roles Section */}
      <div className="mb-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Join Our Community</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Whether you're ordering food or providing services, there's a place for you at Vartica
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => onRoleSelect(role.id)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left group hover:-translate-y-2 transform duration-300"
              >
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{role.title}</h3>
                <p className="text-gray-600">{role.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Counter */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-xl p-8 md:p-12 text-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Growing Community</h2>
          <p className="text-xl text-amber-100">
            Join thousands of students, vendors, and delivery agents on our platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-5xl font-bold mb-2">7</div>
            <div className="text-xl font-bold">Campus Cafeterias</div>
            <div className="text-amber-100 mt-2">Partnered with top dining facilities</div>
          </div>

          <div>
            <div className="text-5xl font-bold mb-2">100+</div>
            <div className="text-xl font-bold">Student Vendors</div>
            <div className="text-amber-100 mt-2">Entrepreneurial students selling delicious food</div>
          </div>

          <div>
            <div className="text-5xl font-bold mb-2">24/7</div>
            <div className="text-xl font-bold">Late Night Options</div>
            <div className="text-amber-100 mt-2">Satisfy your cravings anytime</div>
          </div>
        </div>
      </div>
    </div>
  );
};