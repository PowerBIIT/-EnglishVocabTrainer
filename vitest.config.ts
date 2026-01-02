import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/lib/**/*.{ts,tsx}'],
      exclude: [
        'src/lib/**/*.test.ts',
        'src/lib/**/*.test.tsx',
        'src/lib/store.ts',
        'src/lib/auth.ts',
        'src/lib/authEmail.ts',
        'src/lib/config.ts',
        'src/lib/db.ts',
        'src/lib/gemini.ts',
        'src/lib/passwordAuth.ts',
        'src/lib/rateLimit.ts',
        'src/lib/stripe.ts',
        'src/lib/subscription.ts',
        'src/lib/userPlan.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
