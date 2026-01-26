import { MessageType } from "discord.js";

export function initReactions(client) {
  const userContext = new Map();

  client.on("messageCreate", async message => {
    if (message.author.bot) return;

    // Boost Message Recognition
    if (message.type === MessageType.GuildBoost || 
        message.type === MessageType.GuildBoostTier1 || 
        message.type === MessageType.GuildBoostTier2 || 
        message.type === MessageType.GuildBoostTier3) {
      try {
        console.log(`[BOOST] Boost erkannt von ${message.author.username}. Sende Herz-Nachricht.`);
        await message.react("❤️");
      } catch (err) {
        console.error("[BOOST] Fehler beim Senden der Herz-Antwort:", err);
      }
      return;
    }

    const content = message.content.toLowerCase().trim();

    if (message.content.includes("🍪")) {
      try {
        console.log(`[REACTION] Keks-Reaktion für ${message.author.username}`);
        await message.channel.send("<:pepecookie:1453796363442585660>");
      } catch {}
    }

    if (message.mentions.everyone) {
      try {
        console.log(`[REACTION] Everyone-Ping-Reaktion für ${message.author.username}`);
        await message.channel.send("<a:pingeveryone:1453800508329558218>");
      } catch {}
    } else if (message.mentions.has(client.user.id)) {
      try {
        console.log(`[REACTION] Bot-Ping-Reaktion für ${message.author.username}`);
        await message.channel.send("<:ping:1453799622303813714>");
      } catch {}
    }
  });
}
