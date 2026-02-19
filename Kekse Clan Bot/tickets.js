import { MessageFlags, PermissionFlagsBits, ChannelType } from "discord.js";
import { getData, setData } from "./ticketsStorage.js";

const ARCHIVE_CATEGORY_ID = "1465452886657077593";
const TEAM_ROLE_ID = "1457906448234319922";

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

async function saveTickets() {
  await setData("tickets", ticketData);
}

export function initTickets(client) {
  loadTickets();

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

  async function createTicket(category, user, guild) {
    const alreadyOpen = Object.values(ticketData.tickets).some(t => t.userId === user.id && t.category === category);
    if (alreadyOpen) return;

    const id = ++ticketData.lastId;
    const idString = id.toString().padStart(4, "0");
    await saveTickets();

    const parentId = CATEGORY_CHANNELS[category];
    
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

      const ticketEmbed = {
        title: `Ticket ${idString}`,
        description: `**User:** ${user.username}\n**Kategorie:** ${category}\n**Erstellt:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        color: 0xffffff
      };

      const greetings = {
        Support: `Hey <@${user.id}>, bitte beschreibe dein Anliegen genauer.`,
        Abholung: `Hey <@${user.id}>, wir benötigen deinen Minecraft Namen und die Info zum Gewinn.`,
        Bewerbung: `Hey <@${user.id}>, ein Teammitglied wird sich in Kürze melden.`
      };

      await channel.send({
        content: `<@&${TEAM_ROLE_ID}>`,
        embeds: [ticketEmbed],
        flags: MessageFlags.SuppressNotifications
      });

      await channel.send({ content: greetings[category] });

    } catch (err) {
      console.error("[TICKET] Fehler beim Erstellen:", err);
    }
  }

  async function closeTicket(channel) {
    const ticket = Object.values(ticketData.tickets).find(t => t.channelId === channel.id);
    if (!ticket) return channel.send("❌ Kein aktives Ticket gefunden.");

    try {
      await channel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: true });
      
      await channel.permissionOverwrites.delete(ticket.userId).catch(() => {});

      await channel.send({ content: `✅ **Ticket archiviert.**\nErstellt von: ${ticket.username}\nID: ${ticket.idString}` });
      
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

    if (cmd === "close" && msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      await closeTicket(msg.channel);
    }
  });
}
