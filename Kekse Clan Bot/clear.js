import { EmbedBuilder, PermissionsBitField } from "discord.js";
const LOG_CHANNEL_ID = "1423413348220796991";
const TEAM_ROLE_ID = "1457906448234319922";
export async function clear(client) {
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
      .setFooter({ text: 'Kekse Clan | Moderation System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!clear") || message.author.bot) return;
    if (!message.member.roles.cache.has(TEAM_ROLE_ID)) {
      await message.delete().catch(() => {});
      const warnMsg = await message.channel.send("❌ Keine Berechtigung!");
      return setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
    }
    const args = message.content.split(/\s+/).slice(1);
    await message.delete().catch(() => {});
    const startTime = Date.now();
    let targetChannel = message.channel;
    let userIds = [];
    let amount = 100;
    let timeframe = null;
    if (/^\d{17,19}$/.test(args[0])) {
      const foundChannel = message.guild.channels.cache.get(args[0]);
      if (foundChannel?.isTextBased()) {
        targetChannel = foundChannel;
        args.shift();
      }
    }
    while (args.length && /^\d{17,19}$/.test(args[0])) {
      userIds.push(args.shift());
    }
    if (args.length) {
      if (/^\d+$/.test(args[0])) amount = Math.min(parseInt(args.shift()), 500);
      else timeframe = args.shift();
    }
    const statusMsg = await message.channel.send("🔍 Suche Nachrichten...");
    let messagesToDelete = [];
    let lastId = null;
    try {
      while (messagesToDelete.length < amount) {
        const fetched = await targetChannel.messages.fetch({ limit: 100, before: lastId });
        if (fetched.size === 0) break;
        for (const msg of fetched.values()) {
          if (userIds.length > 0 && !userIds.includes(msg.author.id)) continue;
          if (timeframe) {
            const ms = parseTimeframe(timeframe);
            if (Date.now() - msg.createdTimestamp > ms) continue;
          }
          messagesToDelete.push(msg);
          if (messagesToDelete.length >= amount) break;
        }
        lastId = fetched.last().id;
        if (fetched.size < 100) break;
      }
      if (messagesToDelete.length === 0) {
        return statusMsg.edit("❌ Keine Nachrichten gefunden, die den Kriterien entsprechen.").then(m => setTimeout(() => m.delete(), 5000));
      }
      let deletedCount = 0;
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const youngMsgs = messagesToDelete.filter(m => m.createdTimestamp > fourteenDaysAgo);
      const oldMsgs = messagesToDelete.filter(m => m.createdTimestamp <= fourteenDaysAgo);
      if (youngMsgs.length > 0) {
        await statusMsg.edit(`🚀 Bulk-Löschung von ${youngMsgs.length} Nachrichten...`);
        const deletedBulk = await targetChannel.bulkDelete(youngMsgs, true);
        deletedCount += deletedBulk.size;
      }
      if (oldMsgs.length > 0) {
        for (let i = 0; i < oldMsgs.length; i++) {
          await oldMsgs[i].delete().catch(() => {});
          deletedCount++;
          if (deletedCount % 5 === 0) await statusMsg.edit(`⏳ Lösche alte Nachrichten: **${deletedCount}/${messagesToDelete.length}**...`);
          await new Promise(r => setTimeout(r, 1200)); 
        }
      }
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      await statusMsg.delete().catch(() => {});
      const finishMsg = await message.channel.send(
        `✅ **Abschlussbericht:**\n- Gelöscht: **${deletedCount}**\n- Dauer: **${duration}s**\n- Kanal: <#${targetChannel.id}>`
      );
      const userList = userIds.length > 0 ? userIds.map(id => `<@${id}>`).join(", ") : "Alle User";
      await sendKekseLog("Nachrichten gelöscht (Clear)", message.author, 
        `**Kanal:** <#${targetChannel.id}>\n` +
        `**Anzahl:** ${deletedCount}\n` +
        `**Filter (User):** ${userList}\n` +
        `**Zeitrahmen:** ${timeframe || "Keiner"}\n` +
        `**Dauer:** ${duration}s`
      );
      setTimeout(() => finishMsg.delete().catch(() => {}), 15000);
    } catch (err) {
      console.error(err);
      if (statusMsg) await statusMsg.edit("❌ Fehler beim Löschen (Berechtigungen prüfen).").catch(() => {});
    }
  });
}
function parseTimeframe(tf) {
  const match = tf.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const num = parseInt(match[1]);
  switch (match[2]) {
    case "s": return num * 1000;
    case "m": return num * 60000;
    case "h": return num * 3600000;
    case "d": return num * 86400000;
    default: return 0;
  }
}
