import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: {
    path: 'http://localhost:8000/openapi.json',
  },
  output: 'src/client',
  plugins: [
    '@hey-api/client-ky',
    '@tanstack/react-query'
  ],
});
