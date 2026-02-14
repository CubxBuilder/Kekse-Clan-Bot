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
  "permission", "bot", "discord", "role", "rolle",
  "bot not responding", "bot does not work", "bot not working",
  "no response from bot", "bot not replying", "bot does nothing",
  "ticket not created", "ticket does not open", "ticket command failed",
  "no permissions", "cannot see channel", "cannot write", "permission missing",
  "cannot send message", "cannot delete message", "reaction not recognized",
  "emoji not working", "button not working", "cannot close ticket",
  "cannot delete ticket", "archive not created", "roles not recognized",
  "cannot move channel", "category cannot be set", "bot lacks admin",
  "bot cannot pin message"
];

const SUPPORT_CATEGORY = "1423413348065611953";
const ADMIN_CATEGORY = "1426271033047912582";

export function initTicketCategory(client) {
  const askedUsers = new Set();

  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    const channel = msg.channel;

    if (!channel.parentId || channel.parentId !== SUPPORT_CATEGORY) return;

    const content = msg.content.toLowerCase();

    const foundTrigger = TRIGGERS.find(trigger => content.includes(trigger));
    if (!foundTrigger) return;

    if (askedUsers.has(msg.author.id)) return;
    askedUsers.add(msg.author.id);

    const germanTriggers = TRIGGERS.slice(0, 31);
    const isGerman = germanTriggers.includes(foundTrigger);

    const questionText = isGerman
      ? `<@${msg.author.id}>, das Ticket-System wurde durch das Schlüsselwort "${foundTrigger}" ausgelöst. Benötigt dieses Ticket einen Admin? (ja / nein)`
      : `<@${msg.author.id}>, the ticket system was triggered by the keyword "${foundTrigger}". Does this ticket require an admin? (yes / no)`;

    const question = await channel.send(questionText);

    const filter = m => m.author.id === msg.author.id;
    const collector = channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on("collect", async response => {
      const answer = response.content.toLowerCase();
      if (["yes", "y", "ja"].includes(answer)) {
        await channel.setParent(ADMIN_CATEGORY);
        const movedText = isGerman
          ? "Dieses Ticket wurde in die Admin-Kategorie verschoben.\n<@&1423427747103113307>" 
    : "This ticket has been moved to the admin category.\n<@&1423427747103113307>";
        await channel.send(movedText);
      } else {
        const ignoredText = isGerman
          ? "Keine Änderungen am Ticket vorgenommen."
          : "No changes made to the ticket.";
        await channel.send(ignoredText);
      }
      askedUsers.delete(msg.author.id);
    });

    collector.on("end", () => {
      askedUsers.delete(msg.author.id);
    });
  });
}
