import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { getData, setData } from "./storage.js";

const ARCHIVE_CATEGORY_ID = "1465452886657077593";

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

async function savePanel(messageId) {
  await setData("ticket_panel", { messageId });
}

export function initTickets(client) {
  loadTickets();

  async function sendTicketPanel(channel) {
    const embed = {
      title: "Wähle den passenden Ticket-Button für dein Anliegen.",
      description:
        "Ein Mitglied der Administration wird sich so schnell wie möglich um dein Anliegen kümmern. Bitte habe etwas Gedult, schließlich sind wir nicht 24/7 online.\n\n" +
        "**1️⃣ Support:**\n- Allgemeine Anliegen und Support\n\n" +
        "**2️⃣ Abholung:**\n- Abholung von Gewinnen von Giveaways\n\n" +
        "**3️⃣ Bewerbung:**\n- Bewerbungen für den Clan auf Minevale.de",
      color: 0xffffff
    };

    const msg = await channel.send({ embeds: [embed] });

    await msg.react("1️⃣");
    await msg.react("2️⃣");
    await msg.react("3️⃣");

    await savePanel(msg.id);
  }

  async function createTicket(category, user, guild) {
    const id = ticketData.lastId + 1;
    ticketData.lastId = id;
    await saveTickets();

    const idString = id.toString().padStart(4, "0");

    const parentId = CATEGORY_CHANNELS[category];
    const parent = guild.channels.cache.get(parentId);
    if (!parent) return;

    let channel;
    try {
      channel = await guild.channels.create({
        name: `${CATEGORY_EMOJI[category]}-${category}-${idString}`,
        type: 0,
        parent: parentId,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });

    } catch (err) {
      console.error("Ticket-Channel konnte nicht erstellt werden", err);
      return;
    }

    ticketData.tickets[idString] = {
      idString,
      category,
      username: user.username,
      userId: user.id,
      channelId: channel.id,
      created: Date.now()
    };
    await saveTickets();

    const ticketEmbed = {
      title: `Ticket ${idString}`,
      description: `**User:** ${user.username}\n**Kategorie:** ${category}\n**Erstellt:** ${new Date().toLocaleString()}`,
      color: 0xffffff
    };

    let text;
    switch (category) {
      case "Support":
        text = `Hey <@${user.id}>, bitte beschreibe dein Anliegen genauer.`;
        break;
      case "Abholung":
        text = `Hey <@${user.id}>, wir benötigen deinen Minecraft Username und die Info, was du gewonnen hast.`;
        break;
      case "Bewerbung":
        text = `Hey <@${user.id}>, ein Mitglied des Supportes wird sich so schnell wie möglich um dich kümmern.`;
        break;
    }

    await channel.send({
      content: `<@&1457906448234319922>`,
      embeds: [ticketEmbed],
      flags: MessageFlags.SuppressNotifications
    });

    await channel.send({ content: text });
  }

  async function closeTicket(channel) {
    const ticket = Object.values(ticketData.tickets).find(t => t.channelId === channel.id);
    if (!ticket) return;

    console.log(`[TICKET] Archiviere Ticket ${ticket.idString} von ${ticket.username}...`);

    try {
      await channel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: false });
      
      const user = await channel.guild.members.fetch(ticket.userId).catch(() => null);
      if (user) {
        await channel.permissionOverwrites.edit(user.id, {
          ViewChannel: false,
          SendMessages: false
        });
      }

      await channel.send({ content: `✅ Ticket wurde von einem Teammitglied geschlossen und archiviert.` });
      
      delete ticketData.tickets[ticket.idString];
      await saveTickets();
    } catch (err) {
      console.error("[TICKET] Fehler beim Schließen des Tickets:", err);
    }
  }

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    await reaction.message.fetch().catch(() => {});
    
    const panelData = getData("ticket_panel");
    if (!panelData || reaction.message.id !== panelData.messageId) return;

    let category;
    switch (reaction.emoji.name) {
      case "1️⃣": category = "Support"; break;
      case "2️⃣": category = "Abholung"; break;
      case "3️⃣": category = "Bewerbung"; break;
      default: return;
    }

    await createTicket(category, user, reaction.message.guild);
    await reaction.users.remove(user.id).catch(() => {});
  });

  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!")) return;
    if (!msg.member.roles.cache.has("1457906448234319922")) return;

    const args = msg.content.slice(1).split(" ");
    const cmd = args.shift().toLowerCase();

    if (cmd === "ticket_panel") {
      await sendTicketPanel(msg.channel);
    }

    if (cmd === "ticket") {
      const category = args[0];
      if (!category) return msg.channel.send("❌ Bitte Kategorie angeben: Support, Abholung, Bewerbung");
      await createTicket(category, msg.author, msg.guild);
    }

    if (cmd === "close") {
      await closeTicket(msg.channel, args.join(" ") || "Keine Angabe");
    }

  });
}
