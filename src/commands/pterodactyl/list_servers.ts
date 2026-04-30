import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { buildError } from '@pookiesoft/bongbot-core';
import Database from '../../helpers/database.js';

export default class ListServers {
    private db: Database;
    constructor(db: Database) {
        this.db = db;
    }

    public async execute(interaction: ChatInputCommandInteraction) {
        try {
            const servers = this.db.getServersByUserId(interaction.user.id);
            const embed = new EmbedBuilder()
                .setColor('#0099ff') // TODO: [TECHNICAL_DEBT 3.3] Extract to shared EMBED_COLORS constant (duplicated in serverStatusEmbed.ts)
                .setTitle('🎮 Registered Servers')
                .setTimestamp();
            if (servers.length === 0) {
                embed.setDescription('You have no registered servers.');
                return { embeds: [embed] };
            }
            servers.forEach((server) => {
                embed.addFields({
                    name: server.serverName,
                    value: `URL: ${server.serverUrl}`,
                });
            });
            return { embeds: [embed], ephemeral: true };
        } catch (error) {
            return await buildError(interaction, error);
        }
    }
}
