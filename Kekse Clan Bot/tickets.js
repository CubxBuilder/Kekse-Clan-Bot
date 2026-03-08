import { MessageFlags, PermissionFlagsBits, ChannelType, EmbedBuilder } from "discord.js";
import { getData, setData } from "./ticketsStorage.js";

const ARCHIVE_CATEGORY_ID = "1465452886657077593";
const TEAM_ROLE_ID = "1457906448234319922";
const LOG_CHANNEL_ID = "1423413348220796991";
const ADMIN_ROLE_ID = "1423427747103113307";

const CATEGORY_EMOJI = {
  Support: "⚙️",
  Abholung: "🎉",
  Bewerbung: "✉️"
};

const CATEGORY_CHANNELS = {
  Support: "1423413348065611953",
  Abholung: "1423413348065611953",
  Bewerbung: "1434277752982474945"
};

let ticketData = { lastId: 0, tickets: {} };

function loadTickets() {
  const stored = getData("tickets");
  if (stored) ticketData = stored;
}
function isBlocked(userId) {
  const blocked = getData("blocked_users") || {};
  if (!blocked[userId]) return false;
  if (Date.now() > blocked[userId].until) {
    delete blocked[userId];
    setData("blocked_users", blocked);
    return false;
  }
  return true;
}

async function saveTickets() {
  await setData("tickets", ticketData);
}

export function initTickets(client) {
  loadTickets();
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
      .setFooter({ text: 'Kekse Clan | Ticket System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };

  async function sendTicketPanel(channel) {
    const embed = {
      title: "Wähle den passenden Ticket-Button für dein Anliegen.",
      description:
        "Ein Mitglied der Administration wird sich so schnell wie möglich um dein Anliegen kümmern. Bitte habe etwas Geduld.\n\n" +
        "**1️⃣ Support:**\n- Allgemeine Anliegen\n\n" +
        "**2️⃣ Abholung:**\n- Gewinn-Abholung\n\n" +
        "**3️⃣ Bewerbung:**\n- Clan-Bewerbungen",
      color: 0xffffff
    };

    const msg = await channel.send({ embeds: [embed] });
    await msg.react("1️⃣");
    await msg.react("2️⃣");
    await msg.react("3️⃣");

    await setData("ticket_panel", { messageId: msg.id });
  }
  async function blockUser(userId, username, durationMs = 7 * 24 * 60 * 60 * 1000) {
    const blocked = getData("blocked_users") || {};
    blocked[userId] = {
      username,
      until: Date.now() + durationMs,
      reason: "Spam / Limit überschritten"
    };
    await setData("blocked_users", blocked);
  }
  async function createTicket(category, user, guild) {
    const alreadyOpen = Object.values(ticketData.tickets).some(t => t.userId === user.id && t.category === category);
    if (alreadyOpen) return;
    if (isBlocked(user.id)) return;
    const id = ++ticketData.lastId;
    const idString = id.toString().padStart(4, "0");
    const openTickets = Object.values(ticketData.tickets).filter(t => t.userId === user.id);
    const parentId = CATEGORY_CHANNELS[category];
    const recentTickets = openTickets.filter(t => (Date.now() - t.created) < 60000);
    if (recentTickets.length >= 2) {
      await blockUser(user.id, user.username);
      return;
    }
    try {
      const channel = await guild.channels.create({
        name: `${CATEGORY_EMOJI[category]}-${category}-${idString}`,
        type: ChannelType.GuildText,
        parent: parentId,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: TEAM_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });

      ticketData.tickets[idString] = {
        idString, category, username: user.username, userId: user.id, channelId: channel.id, created: Date.now()
      };
      await saveTickets();

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`Ticket ${idString}`)
        .setDescription(`**User:** ${user.username}\n**Kategorie:** ${category}\n**Erstellt:** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setColor(0xffffff)
        .setFooter({ text: "Kekse Clan" });

      const greetings = {
        Support: `Hey <@${user.id}>, bitte beschreibe dein Anliegen genauer.`,
        Abholung: `Hey <@${user.id}>, wir benötigen deinen **Minecraft Namen** und die **Info zum Gewinn**.`,
        Bewerbung: `Hey <@${user.id}>, ein Teammitglied wird sich in Kürze melden.`
      };

      await channel.send({
        content: `<@&${TEAM_ROLE_ID}>`,
        embeds: [ticketEmbed],
        flags: MessageFlags.SuppressNotifications
      });

      await channel.send({ content: greetings[category] });

      // Log: Ticket Erstellung
      await sendKekseLog("Ticket Erstellt", user, `**Kategorie:** ${category}\n**Kanal:** ${channel}\n**ID:** \`${idString}\``);

    } catch (err) {
      console.error("[TICKET] Fehler beim Erstellen:", err);
    }
  }

  async function closeTicket(channel, moderator) {
    const ticket = Object.values(ticketData.tickets).find(t => t.channelId === channel.id);
    if (!ticket) return channel.send("❌ Kein aktives Ticket gefunden.");

    try {
      await channel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: true });
      await channel.permissionOverwrites.delete(ticket.userId).catch(() => {});
      await channel.permissionOverwrites.create(TEAM_ROLE_ID, {
          ViewChannel: true,
          SendMessages: true
      });

      await channel.send({ content: `✅ **Ticket archiviert.**\nErstellt von: ${ticket.username}\nID: ${ticket.idString}` });
      
      await sendKekseLog("Ticket Archiviert", moderator, `**Besitzer:** ${ticket.username} (${ticket.userId})\n**Kategorie:** ${ticket.category}\n**Kanal:** ${channel.name}`);

      delete ticketData.tickets[ticket.idString];
      await saveTickets();
    } catch (err) {
      console.error("[TICKET] Fehler beim Schließen:", err);
    }
  }

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    
    const panelData = getData("ticket_panel");
    if (!panelData || reaction.message.id !== panelData.messageId) return;

    const emojis = { "1️⃣": "Support", "2️⃣": "Abholung", "3️⃣": "Bewerbung" };
    const category = emojis[reaction.emoji.name];

    if (category) {
      await createTicket(category, user, reaction.message.guild);
      await reaction.users.remove(user.id).catch(() => {});
    }
  });

  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!") || msg.author.bot) return;
    const args = msg.content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "ticket_panel" && msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      await sendTicketPanel(msg.channel);
      await msg.delete().catch(() => {});
    }

    if (cmd === "ticket") {
      const cat = args[0]?.charAt(0).toUpperCase() + args[0]?.slice(1).toLowerCase();
      if (!CATEGORY_CHANNELS[cat]) return msg.reply("❌ Kategorien: Support, Abholung, Bewerbung");
      await createTicket(cat, msg.author, msg.guild);
    }

    if (cmd === "delete" && msg.member.roles.cache.has(ADMIN_ROLE_ID)) {
      await msg.reply("🗑️ Kanal wird in 5 Sekunden gelöscht...");
      setTimeout(() => msg.channel.delete().catch(() => {}), 5000);
    }
    if (cmd === "close" && msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      await closeTicket(msg.channel, msg.author);
    }
    if (cmd === "block" && msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      const target = msg.mentions.users.first() || { id: args[0] };
      if (!target.id) return msg.reply("❌ User-ID oder Mention fehlt.");  
      let duration = 7 * 24 * 60 * 60 * 1000;
      if (args[1]) {
        const customDays = parseInt(args[1]);
        if (!isNaN(customDays)) duration = customDays * 24 * 60 * 60 * 1000;
      }
      await blockUser(target.id, target.username || "Unbekannt", duration);
      msg.reply(`✅ User <@${target.id}> wurde für ${args[1] || "7"} Tage für Tickets gesperrt.`);
    }
  });
}
