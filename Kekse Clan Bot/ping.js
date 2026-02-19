import { EmbedBuilder } from "discord.js";
export function initPing(client) {
  const TEAM_ROLE_ID = "1457906448234319922";
  const LOG_CHANNEL_ID = "1423413348220796991";
  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!ping") || msg.author.bot) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      const warn = await msg.channel.send("❌ Keine Berechtigung.");
      return setTimeout(() => {
        warn.delete().catch(() => {});
        msg.delete().catch(() => {});
      }, 5000);
    }
    const start = Date.now();
    const sentMsg = await msg.channel.send("🏓 Pinging...").catch(() => null);
    if (!sentMsg) return;
    const end = Date.now();
    const roundtrip = end - start;
    const wsPing = client.ws.ping; 
    await sentMsg.edit({
      content: `🏓 **Pong!**\n- API-Latenz: \`${roundtrip}ms\`\n- WebSocket: \`${wsPing}ms\``
    }).catch(() => {});
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const kekseLog = new EmbedBuilder()
        .setColor('#ffffff')
        .setAuthor({ 
            name: msg.author.username, 
            iconURL: msg.author.displayAvatarURL({ size: 512 }) 
        })
        .setDescription(`**Aktion:** \`!ping\`\n**Ergebnis:** RT: \`${roundtrip}ms\` | WS: \`${wsPing}ms\``)
        .setFooter({ text: 'Kekse Clan | System Check' })
        .setTimestamp();
      
      await logChannel.send({ embeds: [kekseLog] });
    }
    setTimeout(() => {
        sentMsg.delete().catch(() => {});
        msg.delete().catch(() => {});
    }, 10000);
  });
}
