import { EmbedBuilder } from "discord.js";
import { getData, setData } from "./violationsStorage.js";
const LOG_CHANNEL_ID = "1423413348220796991";
const PING_ID = "1151971830983311441";
const LEVELS = [
  { count: 5,  duration: 1 * 86400000, label: "1 Tag" },
  { count: 10, duration: 2 * 86400000, label: "2 Tage" },
  { count: 25, duration: 7 * 86400000, label: "7 Tage" },
  { count: 50, duration: 31 * 86400000, label: "31 Tage" }
];
export async function violations(client) {
  const sendKekseLog = async (action, user, details, color = "#ffffff") => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;
    const logEmbed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ 
          name: user.username, 
          iconURL: user.displayAvatarURL({ size: 512 }) 
      })
      .setDescription(`**Aktion:** \`${action}\`\n${details}`)
      .setFooter({ text: 'Kekse Clan | Automated Security' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    const data = getData("violations");
    if (!data) return;
    const entry = data[message.author.id];
    if (!entry) return;
    if (!entry.appliedLevel) entry.appliedLevel = 0;
    const level = LEVELS.find(l => entry.count >= l.count && entry.appliedLevel < l.count);
    if (!level) return;
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;
    try {
      await member.timeout(level.duration, "Automatisches System: Verstoß-Schwelle erreicht (§2a1n1)");
      entry.appliedLevel = level.count;
      await setData("violations", data);
      await sendKekseLog(
        "Automatischer Timeout", 
        message.author, 
        `**Grund:** Verstoß-Schwelle erreicht (${level.count} Verstöße)\n` +
        `**Dauer:** ${level.label}\n` +
        `**Status:** System-Sanktion ausgeführt.`
      );
    } catch (err) {
      if (entry.adminNotified) return;

      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel) {
        const alertEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("⚠️ Sanktion Fehlgeschlagen")
          .setDescription(
            `<@${PING_ID}>, die automatische Sanktion für <@${member.id}> (${member.user.tag}) schlug fehl.\n\n` +
            `**Grund:** Wahrscheinlich Administrator-Rechte oder Rollen-Hierarchie.\n` +
            `**Erreichte Schwelle:** ${level.count} Verstöße.`
          )
          .setTimestamp();
        await logChannel.send({ content: `<@${PING_ID}>`, embeds: [alertEmbed] });
      }
      entry.adminNotified = true;
      await setData("violations", data);
    }
  });
}
