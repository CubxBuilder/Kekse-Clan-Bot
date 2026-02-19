import { 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from "discord.js";
import { getData, setData } from "./storage.js";

const GIVEAWAY_EMOJI = "🎉";
const TEAM_ROLE_ID = "1457906448234319922";
const BOOSTER_ROLE_ID = "1464202435638722621";
const LOG_CHANNEL_ID = "1423413348220796996";
const TICKET_CHANNEL_ID = "1423413348493430905";
const EMBED_COLOR = 0xffffff;

export function initGiveaway(client) {
  const checkGiveaways = async () => {
    const giveaways = getData("activeGiveaways") || {};
    const now = Date.now();
    let changed = false;

    for (const [msgId, data] of Object.entries(giveaways)) {
      const channel = await client.channels.fetch(data.channelId).catch(() => null);
      if (!channel) { delete giveaways[msgId]; changed = true; continue; }

      const msg = await channel.messages.fetch(msgId).catch(() => null);
      if (!msg) { delete giveaways[msgId]; changed = true; continue; }

      if (now >= data.endTime) {
        // SOFORT im Objekt löschen & speichern, um Doppel-Sends zu vermeiden
        delete giveaways[msgId];
        await setData("activeGiveaways", giveaways); 
        changed = false; 

        await endGiveaway(client, msg, data);
        continue;
      } else {
        const embed = EmbedBuilder.from(msg.embeds[0])
          .setDescription(`${data.messageText}\n\nEndet am: <t:${Math.floor(data.endTime / 1000)}:R> (<t:${Math.floor(data.endTime / 1000)}:f>)\nTeilnehmer: **${data.participants?.length || 0}**\nGewinner: **${data.winnerCount}**`);
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }
    }
    if (changed) await setData("activeGiveaways", giveaways);
  };

  setInterval(checkGiveaways, 5000);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== "join_giveaway") return;

    const giveaways = getData("activeGiveaways") || {};
    const data = giveaways[interaction.message.id];

    if (!data) return interaction.reply({ content: "❌ Dieses Giveaway ist nicht mehr aktiv.", ephemeral: true });
    if (data.participants.includes(interaction.user.id)) return interaction.reply({ content: "✅ Du nimmst bereits teil!", ephemeral: true });

    data.participants.push(interaction.user.id);
    await setData("activeGiveaways", giveaways);

    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setDescription(`${data.messageText}\n\nEndet am: <t:${Math.floor(data.endTime / 1000)}:R> (<t:${Math.floor(data.endTime / 1000)}:f>)\nTeilnehmer: **${data.participants.length}**\nGewinner: **${data.winnerCount}**`);
    
    await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
    await interaction.reply({ content: "🎉 Du bist im Lostopf!", ephemeral: true });
  });

  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    // --- REROLL COMMAND (NUR VIA LOGS) ---
    if (msg.content.startsWith("!reroll")) {
      if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) return;
      const messageId = msg.content.split(" ")[1];
      if (!messageId) return msg.reply("Syntax: `!reroll <MessageID>`");

      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (!logChannel) return msg.reply("❌ Log-Kanal nicht gefunden.");

      const logs = await logChannel.messages.fetch({ limit: 50 });
      const logMsg = logs.find(m => m.attachments.some(a => a.name === `report_${messageId}.json`));
      
      if (!logMsg) return msg.reply("❌ Kein Bericht für diese ID gefunden.");
      
      const response = await fetch(logMsg.attachments.first().url);
      const data = await response.json();
      const winner = data.participants[Math.floor(Math.random() * data.participants.length)];
      
      return msg.channel.send(`🔄 **Reroll:** Glückwunsch <@${winner}>! Du hast **${data.prize}** gewonnen!`);
    }

    if (!msg.content.startsWith("!giveaway")) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) return msg.reply("❌ Keine Rechte.");

    const args = msg.content.slice(1).match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "")) || [];
    args.shift();
    if (args.length < 3) return msg.reply("Syntax: `!giveaway #channel 1h \"Preis\" \"Text\" [winners=2]`");

    const channel = msg.mentions.channels.first() || msg.guild.channels.cache.get(args[0]);
    const match = args[1].match(/^(\d+)(s|sec|m|min|h|std|d|tag|tage)$/i);
    if (!channel || !match) return msg.reply("❌ Kanal oder Zeit ungültig.");

    const durationMs = parseDuration(match[1], match[2]);
    const price = args[2], messageText = args[3] || "Viel Glück 🍀";
    let winnerCount = 1;
    args.forEach(arg => { if (arg.startsWith("winners=")) winnerCount = parseInt(arg.split("=")[1]) || 1; });

    const endTime = Date.now() + durationMs;
    const embed = new EmbedBuilder()
      .setTitle(`🎁 Giveaway: ${price}`)
      .setDescription(`${messageText}\n\nEndet am: <t:${Math.floor(endTime / 1000)}:R>\nTeilnehmer: **0**\nGewinner: **${winnerCount}**`)
      .setColor(EMBED_COLOR);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("join_giveaway").setLabel("Teilnehmen").setEmoji(GIVEAWAY_EMOJI).setStyle(ButtonStyle.Primary)
    );

    const giveawayMsg = await channel.send({ content: "<@&1424028650080178348>", embeds: [embed], components: [row] });
    const current = getData("activeGiveaways") || {};
    current[giveawayMsg.id] = { channelId: channel.id, endTime, price, messageText, winnerCount, participants: [] };
    await setData("activeGiveaways", current);
    await msg.delete().catch(() => {});
  });
}

async function endGiveaway(client, msg, data) {
  const participants = data.participants || [];
  let rafflePool = [];
  for (const userId of participants) {
    rafflePool.push(userId);
    const member = await msg.guild.members.fetch(userId).catch(() => null);
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
    .setDescription(`${data.messageText}\n\nGewinner: ${winnerMentions}`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ended").setLabel("Beendet").setStyle(ButtonStyle.Secondary).setDisabled(true)
  );

  await msg.edit({ embeds: [endEmbed], components: [row] }).catch(() => {});
  if (winners.length > 0) {
    msg.channel.send(`🎉 Glückwunsch ${winnerMentions}! Du hast **${data.price}** gewonnen! <#${TICKET_CHANNEL_ID}>`);
  }

  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    const report = { prize: data.price, total_participants: participants.length, winners, participants };
    const buffer = Buffer.from(JSON.stringify(report, null, 2));
    await logChannel.send({
      content: `📊 **Giveaway Bericht**\nPreis: **${data.price}**\nGewinner: ${winnerMentions}`,
      files: [new AttachmentBuilder(buffer, { name: `report_${msg.id}.json` })]
    }).catch(() => {});
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
