import { ChatInputCommandInteraction } from 'discord.js';
import { buildError, Caller } from 'bongbot-core';
import Database from '../../helpers/database.js';
import { fetchServers } from './shared/pterodactyl_api.js';

export default class RegisterServer {
    private db : Database;
    private caller : Caller;
    constructor(db: Database, caller: Caller) {
        this.db = db;
        this.caller = caller;
    }
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            let serverUrl = interaction.options.getString('server_url', true).trim();
            const apiKey = interaction.options.getString('api_key', true).trim();
            const serverName = interaction.options.getString('server_name', true).trim();
            const userId = interaction.user.id;

            if (!serverName) {
                throw new Error('Server name cannot be empty or whitespace.');
            }

            if (serverUrl.endsWith('/')) {
                serverUrl = serverUrl.slice(0, -1);
            }

            try { await fetchServers(this.caller, serverUrl, apiKey); } 
            catch (error) { throw new Error('Failed to connect to the Pterodactyl panel. Please check the URL and API key are valid.'); }

            this.db.addServer({ userId, serverName, serverUrl, apiKey });

            return {
                content: `Successfully registered server **${serverName}**!`,
                ephemeral: true
            };
        } catch (error) {
            return await buildError(interaction, error);
        }
    }
}