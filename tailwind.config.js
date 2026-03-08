/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
  // Safelist critical classes to prevent purging
  safelist: [
    // Layout
    'flex', 'flex-col', 'flex-1', 'grid', 'block', 'inline-block', 'hidden',
    // Positioning  
    'absolute', 'relative', 'fixed', 'sticky', 'inset-0',
    // Spacing
    'p-4', 'p-6', 'px-4', 'py-2', 'm-0', 'mx-auto',
    // Sizing
    'w-full', 'h-full', 'min-h-screen', 'max-w-md',
    // Colors
    'bg-white', 'bg-black', 'bg-slate-900', 'bg-green-500', 'bg-gray-100',
    // Text
    'text-white', 'text-black', 'text-gray-600', 'text-sm', 'text-lg', 'font-bold',
    // Borders
    'border', 'border-b', 'rounded-lg', 'rounded-full',
  ],
};
