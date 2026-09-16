import { server } from './mocks/server.js';
import { vi } from 'vitest';

vi.mock('fs', () => ({
    readFileSync: vi.fn(),
}));

// Global test mock for better-sqlite3 to avoid loading native bindings in tests
const mockRun = vi.fn();
const mockPrepare = vi.fn(() => ({ run: mockRun }));
const mockDb = {
    prepare: mockPrepare,
    exec: vi.fn(),
    close: vi.fn(),
};
vi.mock('better-sqlite3', () => ({
    default: vi.fn(function MockDatabase() {
        return mockDb;
    }),
}));

// Expose the sqlite mocks to tests so we can assert the logger wrote to the DB
// without having to re-mock better-sqlite3 inside each test file.
// @ts-ignore
globalThis.__mockBetterSqliteRun = mockRun;
// @ts-ignore
globalThis.__mockBetterSqlitePrepare = mockPrepare;
// @ts-ignore
globalThis.__mockBetterSqliteDb = mockDb;

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => {
    server.close();
});
