import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";

const TRIGGERS = [
  "bot reagiert", "bot funzt", "bot geht", "keine reaktion vom bot",
  "bot antwortet", "bot macht nix", "ticket wird erstellt", "ticket öffnet",
  "ticket geht", "kann ticket öffnen", "ticket befehl funzt", "keine rechte",
  "kann channel sehen", "kann schreiben", "berechtigung fehlt",
  "nachricht senden", "kann nachricht löschen", "reaktion wird erkannt",
  "emoji geht", "button funzt", "reaction auf panel", "ticket schließen",
  "ticket löschen", "archiv wird erstellt", "rollen werden erkannt",
  "channel verschieben", "kategorie kann gesetzt werden",
  "bot hat admin rechte", "bot kann nachricht pinnen",
  "permission", "bot", "discord", "role", "rolle"
];

const SUPPORT_CATEGORY = "1423413348065611953";
const ADMIN_CATEGORY = "1426271033047912582";
const ADMIN_ROLE = "1423427747103113307";
const TEAM_ROLE = "1457906448234319922";

export function initTicketCategory(client) {
  const askedUsers = new Set();

  client.on("messageCreate", async msg => {
    if (msg.author.bot || !msg.guild) return;

    if (msg.content.startsWith("!moveadmin")) {
        if (!msg.member.roles.cache.has(TEAM_ROLE)) return;
        await msg.delete().catch(() => {});
        return moveChannelToAdmin(msg.channel, true);
    }

    const channel = msg.channel;
    if (channel.parentId !== SUPPORT_CATEGORY) return;

    const content = msg.content.toLowerCase();
    const foundTrigger = TRIGGERS.find(t => content.includes(t));
    
    if (!foundTrigger || (foundTrigger.length < 4 && content !== foundTrigger)) return;
    if (askedUsers.has(msg.author.id)) return;

    askedUsers.add(msg.author.id);
    const isGerman = TRIGGERS.indexOf(foundTrigger) <= 30;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('move_yes').setLabel(isGerman ? 'Ja / Yes' : 'Yes').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('move_no').setLabel(isGerman ? 'Nein / No' : 'No').setStyle(ButtonStyle.Danger)
    );

    const questionText = isGerman
      ? `⚠️ <@${msg.author.id}>, Schlüsselwort "**${foundTrigger}**" erkannt. Benötigt dieses Ticket einen **Admin**?`
      : `⚠️ <@${msg.author.id}>, keyword "**${foundTrigger}**" detected. Does this ticket require an **Admin**?`;

    const questionMsg = await channel.send({ content: questionText, components: [row] });

    const collector = questionMsg.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 30000 
    });

    collector.on('collect', async i => {
      if (i.user.id !== msg.author.id) {
          return i.reply({ content: isGerman ? "Nur der Ticket-Ersteller kann das entscheiden." : "Only the ticket creator can decide.", ephemeral: true });
      }

      if (i.customId === 'move_yes') {
        await i.update({ content: isGerman ? "⏳ Verschiebe..." : "⏳ Moving...", components: [] });
        await moveChannelToAdmin(channel, isGerman);
      } else {
        await i.update({ content: isGerman ? "👍 Support übernimmt." : "👍 Support will handle it.", components: [] });
        setTimeout(() => questionMsg.delete().catch(() => {}), 5000);
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      askedUsers.delete(msg.author.id);
      if (reason === 'time') questionMsg.delete().catch(() => {});
    });
  });
}

async function moveChannelToAdmin(channel, isGerman) {
    try {
        await channel.setParent(ADMIN_CATEGORY, { lockPermissions: true });
        await channel.send(isGerman 
          ? `✅ Dieses Ticket wurde zu den **Admins** verschoben.\n<@&${ADMIN_ROLE}>` 
          : `✅ This ticket has been moved to the **Admins**.\n<@&${ADMIN_ROLE}>`
        );
    } catch (err) {
        console.error("Fehler beim Verschieben:", err);
        await channel.send("❌ Fehler beim Verschieben des Channels.");
    }
}
