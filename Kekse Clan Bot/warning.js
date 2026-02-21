import { EmbedBuilder } from "discord.js";
import { getData, setData } from "./violationsStorage.js";
const LOG_CHANNEL_ID = "1423413348220796991";
const CONFIG = {
  ignoredCategories: [
    "1423413348065611953",
    "1434277752982474945",
    "1426271033047912582"
  ],
  suspiciousKeywords: ["steam", "discord", "labymod", "epic", "gift", "redeem", "nitro", "key"],
  cooldown: 5000,
  warnDeleteAfter: 10000,
  ticketChannel: "1423413348493430905"
};
export async function warning(client) {
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
      .setFooter({ text: 'Kekse Clan | Security System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  client.on("messageCreate", async (message) => {
    if (!isProcessable(message) || isIgnoredCategory(message)) return;
    const result = detectViolation(message.content);
    if (!result) return;
    const userId = message.author.id;
    const now = Date.now();
    const violations = getData("violations") || {};
    if (!violations[userId]) {
      violations[userId] = { name: message.author.username, count: 0, last: 0 };
    }
    if (now - violations[userId].last < CONFIG.cooldown) return;
    violations[userId].count += 1;
    violations[userId].name = message.author.username;
    violations[userId].last = now;
    await setData("violations", violations);
    if (message.deletable) {
      const originalContent = message.content;
      await message.delete().catch(() => {});
      await sendKekseLog("Sicherheits-Verstoß", message.author, 
        `**Erkannt:** ${result}\n` +
        `**Kanal:** ${message.channel}\n` +
        `**Verstöße gesamt:** ${violations[userId].count}\n` +
        `**Inhalt (zensiert):** \`\`\`${originalContent.substring(0, 15)}...\`\`\``
      );
    }
    const warnMsg = await message.channel.send({
      content: `⚠️ <@${userId}>, unser System hat einen **${result}** erkannt. Bitte poste keine sensiblen Daten öffentlich. Bei Missverständnissen erstelle ein Ticket in <#${CONFIG.ticketChannel}>`
    }).catch(() => {});
    if (warnMsg) {
      setTimeout(() => warnMsg.delete().catch(() => {}), CONFIG.warnDeleteAfter);
    }
  });
}
function isProcessable(message) {
  return !message.author.bot && message.guild && message.content;
}
function isIgnoredCategory(message) {
  const channel = message.channel;
  const parentId = channel.parentId || channel.parent?.parentId;
  return parentId && CONFIG.ignoredCategories.includes(parentId);
}
function detectViolation(msg) {
  const lower = msg.toLowerCase();
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  if (emailPattern.test(msg)) return "E-Mail Adresse";
  const cleanMsg = msg
    .replace(/<a?:[a-zA-Z0-9_]+:\d{17,20}>/g, "") 
    .replace(/<[#@&]!?\d{17,20}>/g, "");
  const words = cleanMsg.split(/\s+/);
  for (const word of words) {
    if (word.startsWith("http") || (word.startsWith(":") && word.endsWith(":"))) continue;
    const clean = word.replace(/[^a-z0-9-]/gi, "");
    if (clean.length < 8) continue;
    if (/^\d+$/.test(clean)) continue; 
    const whitelist = ["windows", "download", "installer", "x86_64", "64-bit"];
    if (whitelist.includes(clean.toLowerCase())) continue;
    const isGiftCardFormat = /^([A-Z0-9]{4,6}-){2,}[A-Z0-9]{4,6}$/i.test(clean);
    if (isGiftCardFormat) return "Gutschein Code";
    const hasNumbers = /\d/.test(clean);
    const hasLetters = /[a-z]/i.test(clean);
    if (hasNumbers && hasLetters) {
      const hasKeyword = CONFIG.suspiciousKeywords.some(k => lower.includes(k)) || 
                         /\b(code|key|free|gratis|geschenk|redeem|nitro)\b/.test(lower);
      if (clean.length >= 10 && hasKeyword) return "Gutschein Code";
      const numberCount = (clean.match(/\d/g) || []).length;
      if (clean.length >= 18 && numberCount >= 4) {
        return "sensiblen Key / Token";
      }
    }
  }
  return null;
}
