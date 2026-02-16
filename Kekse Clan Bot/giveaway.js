import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { getData, setData } from "./storage.js";

const GIVEAWAY_EMOJI = "🎉";
const TEAM_ROLE_ID = "1457906448234319922";
const EMBED_COLOR = 0xffffff;
const LOG_CHANNEL_ID = "1423413348220796996";
const TICKET_CHANNEL_ID = "1423413348493430905";

export function initGiveaway(client) {
  
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
        await endGiveaway(client, msg, data);
        delete giveaways[msgId];
        changed = true;
      } else {
        const embed = EmbedBuilder.from(msg.embeds[0])
          .setDescription(`${data.messageText}\n\nEndet am: <t:${Math.floor(data.endTime / 1000)}:R>\nEntries: ${data.participants.length}\nWinners: ${data.winnerCount}`);
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }
    }
    if (changed) await setData("activeGiveaways", giveaways);
  };

  setInterval(checkGiveaways, 30000);

  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!giveaway") || msg.author.bot) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) return msg.channel.send("❌ Keine Rechte.");

    const args = msg.content.split(/\s+/).slice(1);
    if (args.length < 3) return msg.channel.send("Syntax: `!giveaway #channel 1h Preis [Text] [winners=2]`");

    const channel = msg.mentions.channels.first() || msg.guild.channels.cache.get(args[0]);
    if (!channel) return msg.channel.send("❌ Kanal nicht gefunden.");

    const match = args[1].match(/^(\d+)([smhd])$/);
    if (!match) return msg.channel.send("❌ Format: 10s, 5m, 2h, 1d");

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
      .setDescription(`${messageText}\n\nEndet am: <t:${Math.floor(endTime / 1000)}:F>\nEntries: 0\nWinners: ${winnerCount}`)
      .setColor(EMBED_COLOR);

    const giveawayMsg = await channel.send({ embeds: [embed] });
    await giveawayMsg.react(GIVEAWAY_EMOJI);

    const giveaways = getData("activeGiveaways") || {};
    giveaways[giveawayMsg.id] = {
      channelId: channel.id,
      startTime,
      endTime,
      price,
      messageText,
      winnerCount,
      hostId: msg.author.id,
      participants: []
    };
    await setData("activeGiveaways", giveaways);
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot || reaction.emoji.name !== GIVEAWAY_EMOJI) return;
    
    const giveaways = getData("activeGiveaways") || {};
    const data = giveaways[reaction.message.id];
    if (!data) return;

    if (!data.participants.includes(user.id)) {
      data.participants.push(user.id);
      await setData("activeGiveaways", giveaways);
    }
    await reaction.users.remove(user.id).catch(() => {});
  });
}

async function endGiveaway(client, msg, data) {
  const participants = data.participants || [];
  const winners = shuffle([...participants]).slice(0, data.winnerCount);
  const winnerMentions = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "Niemand";

  // 1. Embed im Giveaway-Kanal aktualisieren
  const endEmbed = EmbedBuilder.from(msg.embeds[0])
    .setTitle(`🎊 Giveaway beendet: ${data.price}`)
    .setDescription(`${data.messageText}\n\nEntries: ${participants.length}\nGewinner: ${winnerMentions}`);

  await msg.edit({ embeds: [endEmbed] }).catch(() => {});

  // 2. Gewinner benachrichtigen
  if (winners.length > 0) {
    msg.channel.send(`🎉 Glückwunsch ${winnerMentions}! Du hast **${data.price}** gewonnen! Erstelle ein <#${TICKET_CHANNEL_ID}> um deinen Gewinn abzuholen.`);
  } else {
    msg.channel.send("❌ Keine Teilnehmer, kein Gewinner.");
  }

  // 3. JSON-Bericht erstellen und senden
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (logChannel) {
    // Userdetails für die Datei sammeln
    const participantDetails = await Promise.all(
      participants.map(async (id) => {
        const user = await client.users.fetch(id).catch(() => null);
        return { id, username: user ? user.username : "Unknown" };
      })
    );

    const report = {
      giveaway_id: msg.id,
      prize: data.price,
      host_id: data.hostId,
      duration_seconds: Math.floor((data.endTime - data.startTime) / 1000),
      total_participants: participants.length,
      winners: winners,
      participants_list: participantDetails
    };

    const buffer = Buffer.from(JSON.stringify(report, null, 2));
    const attachment = new AttachmentBuilder(buffer, { name: `report_${msg.id}.json` });

    await logChannel.send({
      content: `📊 **Giveaway Abschluss-Bericht**\nPreis: **${data.price}**\nTeilnehmer: **${participants.length}**\nGewinner: ${winnerMentions}`,
      files: [attachment]
    }).catch(console.error);
  }
}

function parseDuration(amount, unit) {
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(amount) * map[unit];
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}
