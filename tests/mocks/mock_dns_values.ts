import { vi } from 'vitest';

export default function mockDNSValues() {
    const mockResolve4 = vi.fn<(hostname: string) => Promise<string[]>>().mockResolvedValue(['8.8.8.8']);
    const mockResolve6 = vi.fn<(hostname: string) => Promise<string[]>>().mockResolvedValue(['2001:4860:4860::8888']);
    vi.doMock('dns/promises', () => ({
        default: {
            resolve4: mockResolve4,
            resolve6: mockResolve6,
        },
        resolve4: mockResolve4,
        resolve6: mockResolve6,
    }));
}
