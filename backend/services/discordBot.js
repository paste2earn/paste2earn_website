const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

let client = null;
let isReady = false;

// Initialize Discord bot
function initializeBot() {
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
        console.warn('⚠️ Discord bot token or channel ID not configured. Task notifications disabled.');
        return;
    }

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    });

    client.once('ready', () => {
        isReady = true;
        console.log(`✅ Discord bot logged in as ${client.user.tag}`);
    });

    client.on('error', (error) => {
        console.error('Discord bot error:', error);
        isReady = false;
    });

    client.login(process.env.DISCORD_BOT_TOKEN)
        .catch(err => {
            console.error('Failed to login to Discord:', err.message);
        });
}

// Send task notification to Discord
async function sendTaskNotification(task) {
    if (!client || !isReady) {
        console.warn('Discord bot not ready. Skipping notification.');
        return;
    }

    try {
        const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
        
        if (!channel) {
            console.error('❌ Discord channel not found. Check DISCORD_CHANNEL_ID in .env');
            return;
        }

        // Check if bot has permissions to send messages
        const permissions = channel.permissionsFor(client.user);
        if (!permissions || !permissions.has(['SendMessages', 'EmbedLinks'])) {
            console.error(`❌ Bot missing permissions in #${channel.name}`);
            console.error('Fix: Right-click channel → Permissions → Add "Paste2Earn" bot → Enable "Send Messages" and "Embed Links"');
            return;
        }

        // Create embed message
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤑 New Task Available!')
            .setDescription('⚡ Login & Claim ASAP!')
            .addFields(
                { name: 'Task Type', value: task.type.charAt(0).toUpperCase() + task.type.slice(1), inline: true },
                { name: 'Task ID', value: `#${task.id}`, inline: true },
                { name: 'Reward', value: `$${parseFloat(task.reward).toFixed(2)}`, inline: true }
            )
            .setFooter({ text: 'Paste2Earn' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(`✅ Discord notification sent for task #${task.id}`);
    } catch (error) {
        console.error('❌ Failed to send Discord notification:', error.message);
        if (error.code === 50001) {
            console.error('⚠️ Bot is missing access to the channel.');
        } else if (error.code === 50013) {
            console.error('⚠️ Bot lacks permission to send messages in this channel.');
        }
        console.error('Solution: Check bot permissions in Discord server settings.');
    }
}

// Graceful shutdown
function shutdownBot() {
    if (client) {
        client.destroy();
        console.log('Discord bot disconnected.');
    }
}

module.exports = {
    initializeBot,
    sendTaskNotification,
    shutdownBot
};
