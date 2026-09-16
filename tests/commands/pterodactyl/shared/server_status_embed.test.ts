import { buildServerStatusEmbed } from '../../../../src/commands/pterodactyl/shared/server_status_embed.js';
import type { ServerResources } from '../../../../src/commands/pterodactyl/shared/pterodactyl_api.js';

const server = {
    attributes: { identifier: 'server-123', name: 'Test Server', description: '' },
};

function resourceReading(state = 'running', uptime = 3600000): ServerResources {
    return {
        attributes: {
            current_state: state,
            resources: {
                memory_bytes: 1073741824,
                cpu_absolute: 50.5,
                disk_bytes: 2147483648,
                uptime,
            },
        },
    };
}

describe('server status embed', () => {
    it('formats memory in megabytes', () => {
        const embed = buildServerStatusEmbed([server], [resourceReading()]);

        expect(embed.data.fields?.[0].value).toContain('**Memory:** 1024 MB');
    });

    it('formats CPU usage to one decimal place', () => {
        const embed = buildServerStatusEmbed([server], [resourceReading()]);

        expect(embed.data.fields?.[0].value).toContain('**CPU:** 50.5%');
    });

    it.each([
        [7260000, '2h 1m'],
        [1800000, '30m'],
    ])('formats uptime of %i milliseconds as %s', (uptime, expected) => {
        const embed = buildServerStatusEmbed([server], [resourceReading('running', uptime)]);

        expect(embed.data.fields?.[0].value).toContain(`**Uptime:** ${expected}`);
        if (uptime < 3600000) expect(embed.data.fields?.[0].value).not.toContain('h');
    });

    it.each([
        ['running', '🟢'],
        ['offline', '🔴'],
        ['starting', '🟡'],
        ['stopping', '🟠'],
    ])('shows the status emoji for %s', (state, emoji) => {
        const embed = buildServerStatusEmbed([server], [resourceReading(state)]);

        expect(embed.data.fields?.[0].value).toContain(`${emoji} **Status:** ${state}`);
    });
});
