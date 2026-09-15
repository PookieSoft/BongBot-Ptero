import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        server: {
            deps: {
                inline: ['@pookiesoft/bongbot-core'],
            },
        },
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
            thresholds: {
                lines: 100,
                functions: 100,
                statements: 100,
                branches: 100,
            },
        },
        reporters: ['default', 'junit'],
        outputFile: {
            junit: 'test-results/junit.xml',
        },
        exclude: ['**/node_modules/**', '**/dist/**'],
    },
});
