// metrix-core/frontend/postcss.config.mjs
/*
Purpose: Configures PostCSS with the official Tailwind CSS v4 plugin.

Context: Enables @theme inline token compilation in src/app/globals.css.

Implementation Specs: Exports the @tailwindcss/postcss plugin configuration.
*/

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
