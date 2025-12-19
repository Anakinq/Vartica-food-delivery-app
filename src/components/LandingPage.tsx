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
    '/premium_photo-1694141251686-16828ed92b3f.jpeg'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">Vartica</span>
            </div>

            <div className="flex items-center">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <div className="hidden lg:flex space-x-4">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => onRoleSelect(role.id)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                  >
                    {role.title}
                  </button>
                ))}
              </div>
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
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with Food Image Carousel */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-900 to-orange-900">
        {/* Food Image Carousel Background */}
        <div className="absolute inset-0 opacity-30">
          <div className="food-carousel-container relative w-full h-full">
            {foodImages.map((img, index) => (
              <div
                key={index}
                className="food-carousel-slide absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                style={{
                  backgroundImage: `url(${img})`,
                  opacity: index === 0 ? 1 : 0
                }}
              />
            ))}
          </div>
        </div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-7xl font-bold text-white mb-6">
              Welcome to <span className="text-yellow-300">Vartica</span>
            </h1>
            <p className="text-xl md:text-2xl text-amber-100 max-w-3xl mx-auto mb-10">
              Your campus food delivery solution connecting students with cafeterias,
              student vendors, and late-night food options
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => onRoleSelect('customer')}
                className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-full text-lg hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Order Food Now
              </button>
              <button
                onClick={() => setMenuOpen(true)}
                className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full text-lg hover:bg-white hover:text-amber-900 transition-all"
              >
                View Options
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Featured Food Gallery */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Delicious Campus Food</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Explore the amazing variety of food available on campus
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {foodImages.slice(0, 4).map((img, index) => (
                <div key={index} className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <div
                    className="h-64 bg-cover bg-center transform group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundImage: `url(${img})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 className="font-bold text-lg">Delicious Meal {index + 1}</h3>
                    <p className="text-sm text-amber-200">Available now</p>
                  </div>
                </div>
              ))}
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
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <UtensilsCrossed className="h-8 w-8 text-amber-400" />
              <span className="text-2xl font-bold">Vartica</span>
            </div>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Making campus food delivery easy, convenient, and accessible for everyone.
            </p>
            <div className="mt-8 text-gray-500 text-sm">
              © {new Date().getFullYear()} Vartica. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Animation styles in a separate style tag */}
      <style>{`
        @keyframes foodCarousel {
          0%, 20% { opacity: 1; }
          25%, 45% { opacity: 0; }
          50%, 70% { opacity: 0; }
          75%, 95% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        .food-carousel-slide:nth-child(1) { animation: foodCarousel 20s infinite; }
        .food-carousel-slide:nth-child(2) { animation: foodCarousel 20s infinite; animation-delay: 5s; }
        .food-carousel-slide:nth-child(3) { animation: foodCarousel 20s infinite; animation-delay: 10s; }
        .food-carousel-slide:nth-child(4) { animation: foodCarousel 20s infinite; animation-delay: 15s; }
        
        @media (min-width: 768px) {
          .food-carousel-slide:nth-child(1) { animation: foodCarousel 25s infinite; }
          .food-carousel-slide:nth-child(2) { animation: foodCarousel 25s infinite; animation-delay: 5s; }
          .food-carousel-slide:nth-child(3) { animation: foodCarousel 25s infinite; animation-delay: 10s; }
          .food-carousel-slide:nth-child(4) { animation: foodCarousel 25s infinite; animation-delay: 15s; }
          .food-carousel-slide:nth-child(5) { display: block; animation: foodCarousel 25s infinite; animation-delay: 4s; }
          .food-carousel-slide:nth-child(6) { display: block; animation: foodCarousel 25s infinite; animation-delay: 8s; }
          .food-carousel-slide:nth-child(7) { display: block; animation: foodCarousel 25s infinite; animation-delay: 12s; }
          .food-carousel-slide:nth-child(8) { display: block; animation: foodCarousel 25s infinite; animation-delay: 16s; }
        }
      `}</style>
    </div>
  );
};