import { ChatInputCommandInteraction } from 'discord.js';
import { buildError } from '@pookiesoft/bongbot-core';
import Database from '../../helpers/database.js';

export default class RemoveServer {
    private db: Database;
    constructor(db: Database) {
        this.db = db;
    }
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const serverName = interaction.options.getString('server_name', true).trim();
            const userId = interaction.user.id;
            // TODO: [EXTRAS 2.4] Add confirmation Modal or ephemeral prompt before deleting
            this.db.deleteServer(userId, serverName);

            return {
                content: `Successfully removed server **${serverName}**!`,
                ephemeral: true,
            };
        } catch (error) {
            return await buildError(interaction, error);
        }
    }
}
