import { 
  ChannelType, 
  PermissionsBitField, 
  EmbedBuilder 
} from "discord.js";
import { getData, setData } from "./dmTicketsStorage.js";
const CATEGORY_ID = "1465790388517474397";
const LOG_CHANNEL_ID = "1423413348220796991";
const TEAM_ROLE_ID = "1457906448234319922";
const CLOSED_CATEGORY_ID = "1465452886657077593";
let OPEN_HELP = new Map();
let MAIN_GUILD = null;
export async function initSupport(client) {
  MAIN_GUILD = client.guilds.cache.first();
  const savedData = getData("tickets") || {};
  OPEN_HELP = new Map(Object.entries(savedData));
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
      .setFooter({ text: 'Kekse Clan | Modmail System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;
    if (msg.guild && msg.content === ".help") {
      msg.delete().catch(() => {});
      if (OPEN_HELP.has(msg.author.id)) {
        return msg.channel.send(`<@${msg.author.id}>, du hast bereits einen offenen Support-Channel.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
      const botMsg = await msg.channel.send("Reagiere mit ✅ um Hilfe zu erhalten.");
      await botMsg.react("✅");
      const filter = (reaction, user) => reaction.emoji.name === "✅" && user.id === msg.author.id;
      botMsg.awaitReactions({ filter, max: 1, time: 20000, errors: ["time"] })
        .then(async () => {
          const lastId = getData("last_ticket_id") || 0;
          const nextId = lastId + 1;
          const index = String(nextId).padStart(4, "0");
          const channel = await MAIN_GUILD.channels.create({
            name: `modmail-${msg.author.username}-${index}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
              { id: MAIN_GUILD.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: msg.author.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
              { id: TEAM_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}
            ]
          });
          OPEN_HELP.set(msg.author.id, channel.id);
          await setData("tickets", Object.fromEntries(OPEN_HELP));
          await setData("last_ticket_id", nextId);
          const welcomeEmbed = new EmbedBuilder()
            .setTitle("Support Ticket Geöffnet")
            .setDescription(`Hallo **${msg.author.username}**, dein Ticket wurde erstellt!\nSchreibe hier oder per DM, um mit dem Team zu kommunizieren.`)
            .setColor("#ffffff")
            .setFooter({ text: "Kekse Clan" });
          await channel.send({ content: `<@&${TEAM_ROLE_ID}>`, embeds: [welcomeEmbed] });
          await msg.author.send({ embeds: [welcomeEmbed] }).catch(() => {});
          await sendKekseLog("Modmail Ticket geöffnet", msg.author, `**Kanal:** ${channel}\n**ID:** \`${index}\``);        
          botMsg.delete().catch(() => {});
        })
        .catch(() => botMsg.delete().catch(() => {}));
    }
    if (msg.content === ".close" && OPEN_HELP.has(msg.author.id)) {
      const channelId = OPEN_HELP.get(msg.author.id);
      const channel = MAIN_GUILD.channels.cache.get(channelId);
      const closeInfo = "Support-Verbindung getrennt. Das Ticket wurde archiviert.";
      if (channel) {
        await channel.setParent(CLOSED_CATEGORY_ID, { lockPermissions: false }).catch(() => {});
        await channel.send(closeInfo);
        await sendKekseLog("Modmail Ticket archiviert", msg.author, `**Kanal:** ${channel.name}\n**Status:** Erfolgreich geschlossen.`);
      }
      OPEN_HELP.delete(msg.author.id);
      await setData("tickets", Object.fromEntries(OPEN_HELP));
      await msg.author.send(closeInfo).catch(() => {});
    }
    if (msg.channel.type === ChannelType.DM) {
      const channelId = OPEN_HELP.get(msg.author.id);
      if (!channelId) return;
      const channel = MAIN_GUILD.channels.cache.get(channelId);
      if (!channel) return;
      const dmEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
        .setDescription(msg.content)
        .setColor("#ffffff")
        .setTimestamp();
      await channel.send({ embeds: [dmEmbed] });
    }
    if (msg.guild) {
      for (const [userId, channelId] of OPEN_HELP) {
        if (msg.channel.id === channelId && !msg.author.bot && !msg.content.startsWith(".")) {
          const user = await client.users.fetch(userId);
          const replyEmbed = new EmbedBuilder()
            .setAuthor({ name: "Kekse Clan Support", iconURL: client.user.displayAvatarURL() })
            .setDescription(msg.content)
            .setColor("#ffffff")
            .setFooter({ text: "Antworte einfach auf diese Nachricht." });
          await user.send({ embeds: [replyEmbed] }).catch(() => {
            msg.channel.send("❌ Fehler: Der User hat seine DMs geschlossen.");
          });
        }
      }
    }
  });
}
