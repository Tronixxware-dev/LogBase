const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // lets older browsers (Chrome before 99) read the stylesheet
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;