/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // 기본 sans 를 SUITE 로 덮어써서 모든 Tailwind 텍스트가 SUITE 를 쓰게 한다.
        sans: ['SUITE', 'sans-serif'],
        suite: ['SUITE', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
