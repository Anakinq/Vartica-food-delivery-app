/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
  // Safelist critical classes to prevent purging - keep minimal for better tree-shaking
  safelist: [
    // Only safelist truly critical classes used in initial render
    'flex', 'grid', 'block', 'hidden', 'absolute', 'relative',
    'min-h-screen', 'w-full', 'h-full',
    'bg-slate-900', 'bg-white', 'text-white', 'text-black',
  ],
};
