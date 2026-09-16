import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{js,ts}'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                'babel.config.js',
                'vitest.config.ts',
                'tests/utils/**',
                'tests/mocks/**',
                'coverage/**',
            ],
            reporter: ['text', 'text-summary', 'json', 'json-summary', 'lcov'],
        },
        reporters: ['default', 'junit'],
        outputFile: {
            junit: 'test-results/junit.xml',
        },
        exclude: ['**/node_modules/**', '**/dist/**'],
    },
});
