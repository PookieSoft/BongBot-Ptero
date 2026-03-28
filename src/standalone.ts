import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import type { Message, InteractionReplyOptions, CommandInteraction, Interaction } from 'discord.js';
import type { ExtendedClient } from 'bongbot-core';
import { LOGGER, buildUnknownError, generateCard, validateRequiredConfig } from 'bongbot-core';
import crypto from 'crypto';
import buildCommands from './commands/build_commands.js';

// TODO: [TECHNICAL_DEBT 3.6] Allow env var overrides for forkability
const GITHUB_REPO_OWNER = 'Mirasii';
const GITHUB_REPO_NAME = 'BongBot-Ptero';


export function startBot() {
    // Validate required environment variables early to fail fast
    const errors: string[] = [];
    if (!process.env.DISCORD_API_KEY) { errors.push('DISCORD_API_KEY is required'); }
    validateRequiredConfig();
    const token: string = process.env.DISCORD_API_KEY!;
    const bot: ExtendedClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

    /** set up logging */
    process.env.SESSION_ID = crypto.randomUUID();
    buildCommands(bot);

    /** respond to slash commands */
    bot.on('interactionCreate', async (interaction: Interaction) => {
        if (!interaction.isCommand()) { return; }
        interaction as CommandInteraction; // TODO: [TECHNICAL_DEBT 4] Redundant cast — TypeScript narrows after isCommand() guard

        try {
            const command = bot.commands!.get(interaction.commandName);
            if (!command) return;
            await interaction.deferReply({ flags: command.msgFlag || MessageFlags.Loading });
            const response = await command.execute(interaction, bot);
            if (response?.isError === true && interaction.replied) {
                await interaction.deleteReply();
            }
            const message = await interaction.followUp(response);
            // TODO: [TECHNICAL_DEBT 1.1 / ARCHITECTURE 3.1] Replace `as any` with a CommandWithCollector type guard interface
            if (command && typeof (command as any).setupCollector=== 'function') {
                await (command as any).setupCollector(interaction, message);
            }
        } catch (error) {
            if (interaction.replied) { await interaction.deleteReply(); }
            await interaction.followUp(await buildUnknownError(error) as InteractionReplyOptions);
        }
    });

    /** set commands on bot ready */
    bot.on('clientReady', async () => {
        try {
            console.log('Commands Initiated!');
            await postDeploymentMessage(bot);
        } catch (error) {
            LOGGER.log(error);
        }
    });

    /** login to bot */
    bot.login(token);
    console.log('BongBot Online!');
    console.log(`sessionId: ${process.env.SESSION_ID}`);
}

const postDeploymentMessage = async (bot: ExtendedClient) => {
    if (!process.env.DISCORD_CHANNEL_ID) { LOGGER.log('DISCORD_CHANNEL_ID not set'); return; }
    const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    if (!('send' in channel && typeof channel.send === 'function')) return;
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter((msg: Message) =>
            msg.author.id === bot.user!.id &&
            msg.embeds.some(embed =>
                embed.title?.includes(GITHUB_REPO_NAME) ||
                embed.description?.includes(GITHUB_REPO_NAME)
            )
        );
        // TODO: [BUGS 1.2] message.delete() is async but not awaited — use Promise.allSettled with error handling
        botMessages?.forEach((message: Message) => message.delete());
    } catch (err: any) {
        console.warn(`Warning: Could not delete messages. The bot might be missing 'Manage Messages' permissions. Error: ${err.message}`);
    }
    // Send the composed embed to the channel.
    const card = await generateCard(bot, { repoOwner: GITHUB_REPO_OWNER, repoName: GITHUB_REPO_NAME });
    await channel.send({ embeds: [card] });

};

// TODO: [BUGS 4.1] Add SIGTERM/SIGINT handlers for graceful shutdown (DatabasePool.closeAll(), bot.destroy())