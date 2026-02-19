import { 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from "discord.js";
import { getData, setData } from "./giveawayStorage.js";

const GIVEAWAY_EMOJI = "🎉";
const TEAM_ROLE_ID = "1457906448234319922";
const BOOSTER_ROLE_ID = "1464202435638722621";
const LOG_CHANNEL_ID = "1423413348220796991"; // Dein zentraler Log-Kanal
const REPORT_CHANNEL_ID = "1474140482551414899"; // Kanal für JSON-Reports
const TICKET_CHANNEL_ID = "1423413348493430905";
const EMBED_COLOR = 0xffffff;

export function initGiveaway(client) {
  // Hilfsfunktion für Kekse Clan Logs
  const sendKekseLog = async (action, user, details) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;
    const logEmbed = new EmbedBuilder()
      .setColor('#ffffff')
      .setAuthor({ 
          name: user.username, 
          iconURL: user.displayAvatarURL({ size: 512 }) 
      })
      .setDescription(`**Aktion:** \`${action}\`\n${details}`)
      .setFooter({ text: 'Kekse Clan | Giveaway System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };

  const checkGiveaways = async () => {
    const giveaways = getData("activeGiveaways") || {};
    const now = Date.now();
    let changed = false;

    for (const [msgId, data] of Object.entries(giveaways)) {
      const channel = await client.channels.fetch(data.channelId).catch(() => null);
      if (!channel) continue;
      const msg = await channel.messages.fetch(msgId).catch(() => null);
      
      if (!msg) {
        delete giveaways[msgId];
        changed = true;
        continue;
      }

      if (now >= data.endTime) {
        await endGiveaway(client, msg, data, sendKekseLog);
        delete giveaways[msgId];
        changed = true;
      } else {
        const embed = EmbedBuilder.from(msg.embeds[0])
          .setDescription(`${data.messageText}\n\nEndet am: <t:${Math.floor(data.endTime / 1000)}:R> (<t:${Math.floor(data.endTime / 1000)}:f>)\nTeilnehmer: **${data.participants?.length || 0}**\nGewinner: **${data.winnerCount}**`);
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }
    }
    if (changed) await setData("activeGiveaways", giveaways);
  };

  setInterval(checkGiveaways, 10000);

  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!giveaway") || msg.author.bot) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) return msg.reply("❌ Keine Rechte.");

    const args = msg.content.slice(1).match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "")) || [];
    args.shift();
    if (args.length < 3) return msg.reply("Syntax: `!giveaway #channel 1h \"Preis\" \"Text\" [winners=2]`");

    const channel = msg.mentions.channels.first() || msg.guild.channels.cache.get(args[0]);
    if (!channel) return msg.reply("❌ Kanal nicht gefunden.");

    const match = args[1].match(/^(\d+)(s|sec|m|min|h|std|d|tag|tage)$/i);
    if (!match) return msg.reply("❌ Zeitformat ungültig.");

    const durationMs = parseDuration(match[1], match[2]);
    const price = args[2];
    const messageText = args[3] || "Viel Glück 🍀";
    let winnerCount = 1;
    args.forEach(arg => {
      if (arg.startsWith("winners=")) winnerCount = parseInt(arg.split("=")[1]) || 1;
    });

    const startTime = Date.now();
    const endTime = startTime + durationMs;

    const embed = new EmbedBuilder()
      .setTitle(`🎁 Giveaway: ${price}`)
      .setDescription(`${messageText}\n\nEndet am: <t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:f>)\nTeilnehmer: **0**\nGewinner: **${winnerCount}**`)
      .setColor(EMBED_COLOR);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_giveaway_${Date.now()}`)
        .setLabel("Teilnehmen")
        .setEmoji(GIVEAWAY_EMOJI)
        .setStyle(ButtonStyle.Primary)
    );

    const giveawayMsg = await channel.send({
      content: "<@&1424028650080178348>",
      embeds: [embed],
      components: [row]
    });

    const giveaways = getData("activeGiveaways") || {};
    giveaways[giveawayMsg.id] = {
      channelId: channel.id,
      startTime, endTime, price, messageText, winnerCount,
      hostId: msg.author.id,
      participants: []
    };
    await setData("activeGiveaways", giveaways);

    // Log: Giveaway Start
    await sendKekseLog("Giveaway gestartet", msg.author, `**Preis:** ${price}\n**Kanal:** ${channel}\n**Dauer:** ${args[1]}\n**Gewinner:** ${winnerCount}`);
    
    await msg.delete().catch(() => {});
  });

  client.on("interactionCreate", async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith("join_giveaway")) return;
    const giveaways = getData("activeGiveaways") || {};
    const data = giveaways[interaction.message.id];
    
    if (!data) return interaction.reply({ content: "❌ Nicht mehr aktiv.", ephemeral: true });
    if (data.participants.includes(interaction.user.id)) return interaction.reply({ content: "ℹ️ Bereits dabei!", ephemeral: true });

    data.participants.push(interaction.user.id);
    await setData("activeGiveaways", giveaways);

    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setDescription(`${data.messageText}\n\nEndet am: <t:${Math.floor(data.endTime / 1000)}:R> (<t:${Math.floor(data.endTime / 1000)}:f>)\nTeilnehmer: **${data.participants.length}**\nGewinner: **${data.winnerCount}**`);
    
    await interaction.update({ embeds: [updatedEmbed] }).catch(() => {});
  });
}

async function endGiveaway(client, msg, data, logFunc) {
  const guild = msg.guild;
  const participants = data.participants || [];
  let rafflePool = [];
  
  for (const userId of participants) {
    rafflePool.push(userId);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member && member.roles.cache.has(BOOSTER_ROLE_ID)) rafflePool.push(userId);
  }

  const winners = [];
  const shuffledPool = rafflePool.sort(() => Math.random() - 0.5);
  for (const id of shuffledPool) {
    if (winners.length >= data.winnerCount) break;
    if (!winners.includes(id)) winners.push(id);
  }

  const winnerMentions = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "Niemand";
  const endEmbed = EmbedBuilder.from(msg.embeds[0])
    .setTitle(`🎊 Giveaway beendet: ${data.price}`)
    .setDescription(`${data.messageText}\n\nBeendet: <t:${Math.floor(data.endTime / 1000)}:f>\nTeilnehmer: **${participants.length}**\nGewinner: ${winnerMentions}`);

  await msg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});

  if (winners.length > 0) {
    await msg.channel.send(`🎉 Glückwunsch ${winnerMentions}! Du hast **${data.price}** gewonnen!\nMelde dich im Support.`);
  }

  // Log: Giveaway Ende
  const host = await client.users.fetch(data.hostId).catch(() => client.user);
  await logFunc("Giveaway beendet", host, `**Preis:** ${data.price}\n**Teilnehmer:** ${participants.length}\n**Gewinner:** ${winnerMentions}`);

  // JSON Report senden
  const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID).catch(() => null);
  if (reportChannel) {
    const report = { giveaway_id: msg.id, prize: data.price, winners: winners, total_participants: participants.length };
    const buffer = Buffer.from(JSON.stringify(report, null, 2));
    const attachment = new AttachmentBuilder(buffer, { name: `report_${msg.id}.json` });
    await reportChannel.send({ content: `📊 Report für **${data.price}**`, files: [attachment] });
  }
}

function parseDuration(amount, unit) {
  const value = parseInt(amount);
  const u = unit.toLowerCase();
  if (u.startsWith('s')) return value * 1000;
  if (u.startsWith('m')) return value * 60000;
  if (u.startsWith('h') || u === 'std') return value * 3600000;
  if (u.startsWith('d') || u.startsWith('t')) return value * 86400000;
  return 0;
}
