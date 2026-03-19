const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, Partials } = require('discord.js');
const pool = require('../db');

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
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,  // needed for DM verification
        ],
        // Partials are required to receive DMs in Discord.js v14
        partials: [Partials.Channel, Partials.Message]
    });

    client.once('ready', () => {
        isReady = true;
        console.log(`✅ Discord bot logged in as ${client.user.tag}`);
    });

    client.on('error', (error) => {
        console.error('Discord bot error:', error);
        isReady = false;
    });

    // ── DM Verification listener ──────────────────────────────────────────
    // Users send:  !verify <CODE>
    // Bot checks:  code matches + author's Discord username matches stored one
    // ─────────────────────────────────────────────────────────────────────
    client.on('messageCreate', async (message) => {
        // Only handle DMs, ignore bots
        if (message.author.bot) return;
        if (message.channel.type !== ChannelType.DM) return;

        const content = message.content.trim();
        if (!content.toLowerCase().startsWith('!verify ')) return;

        const code = content.split(' ')[1]?.trim().toUpperCase();
        if (!code) {
            return message.reply('❓ Usage: `!verify YOUR_CODE`\nExample: `!verify X4K9P2`');
        }

        // The sender's Discord username (new format: lowercase, no discriminator)
        const discordUsername = message.author.username.toLowerCase();

        try {
            // Look up a user with this exact code that hasn't expired yet
            const result = await pool.query(
                `SELECT id, username, discord_username, discord_verified
                 FROM users
                 WHERE UPPER(discord_verify_code) = $1
                   AND discord_verify_expires > NOW()
                   AND discord_verified = FALSE`,
                [code]
            );

            if (result.rows.length === 0) {
                return message.reply(
                    '❌ **Invalid or expired code.**\n' +
                    'Make sure you typed the code correctly. If it expired, go back to the pending page and click **Resend Code**.'
                );
            }

            const user = result.rows[0];
            const storedUsername = (user.discord_username || '').toLowerCase();

            // Verify the sender's Discord username matches what they registered with
            if (discordUsername !== storedUsername) {
                return message.reply(
                    `❌ **Username mismatch.**\n` +
                    `This code was registered for **@${user.discord_username}** but you are sending from **@${message.author.username}**.\n` +
                    `Please DM from the correct Discord account.`
                );
            }

            // All good — mark as verified, clear the code
            await pool.query(
                `UPDATE users
                 SET discord_verified = TRUE,
                     discord_verify_code = NULL,
                     discord_verify_expires = NULL,
                     updated_at = NOW()
                 WHERE id = $1`,
                [user.id]
            );

            await message.reply(
                `✅ **Discord verified successfully!**\n` +
                `Your Discord account **@${message.author.username}** is now linked to your Paste2Earn account **${user.username}**.\n\n` +
                `You can now go back to the pending page and an admin will review and approve your account shortly.`
            );

            console.log(`✅ Discord verified for user ${user.username} (${message.author.tag})`);
        } catch (err) {
            console.error('Discord verification error:', err);
            message.reply('⚠️ Something went wrong. Please try again in a moment.');
        }
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
            return;
        }

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
        if (error.code === 50001) console.error('⚠️ Bot is missing access to the channel.');
        else if (error.code === 50013) console.error('⚠️ Bot lacks permission to send messages.');
    }
}

// Graceful shutdown
function shutdownBot() {
    if (client) {
        client.destroy();
        console.log('Discord bot disconnected.');
    }
}

async function sendDirectMessageByUsername(discordUsername, messageText) {
    if (!client || !isReady) return;

    try {
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID || '');
        if (!guild) return;

        // Ensure discordUsername is clean
        const clean = discordUsername.trim().replace(/^@/, '').toLowerCase();
        
        // Find member by username
        const members = await guild.members.fetch({ query: clean, limit: 1 });
        const member = members.first();

        if (member) {
            await member.send(messageText);
            console.log(`✅ Direct message sent to ${clean}`);
        } else {
            console.warn(`⚠️ Could not find Discord member ${clean} in guild to send DM.`);
        }
    } catch (err) {
        console.error(`❌ Failed to send DM to ${discordUsername}:`, err.message);
    }
}

module.exports = {
    initializeBot,
    sendTaskNotification,
    sendDirectMessageByUsername,
    shutdownBot
};
