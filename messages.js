import { EmbedBuilder, PermissionsBitField } from "discord.js";
export function registerMessageCommands(client) {
  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith("!")) return;
    if (!msg.member.roles.cache.has("1457906448234319922")) return;
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    const args = msg.content.slice(1).match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "")) || [];
    const cmd = args.shift();

    if (cmd === "send") {
      const channel = msg.mentions.channels.first();
      if (!channel) return;

      const text = msg.content
        .replace(/^!send\s+<#[0-9]+>\s?/, "");

      if (!text) return;
      await channel.send(text);
    }

    if (cmd === "embed") {
      const channel = msg.mentions.channels.first();
      if (!channel) return;

      const title = args[1];
      const text = args[2];
      const color = args[3] || "#ffffff";

      if (!title || !text) return;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(text)
        .setColor(color);

      await channel.send({ embeds: [embed] });
    }

    if (cmd === "dm") {
      const userId = args[0];
      const text = args.slice(1).join(" ");
      if (!userId || !text) return;

      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) return;

      await user.send(text).catch(() => {});
    }

    if (cmd === "reply") {
      // Format: !reply [channel] <messageId> "text"
      let channelMention = msg.mentions.channels.first();
      let msgId, text;

      // Extract all arguments to handle different formats
      const rawArgs = msg.content.slice(1).split(" ");
      rawArgs.shift(); // remove "reply"

      if (channelMention) {
        // Format: !reply #channel <id> "text"
        // Remove the channel mention from args to find the ID
        const filteredArgs = rawArgs.filter(arg => !arg.startsWith("<#"));
        msgId = filteredArgs[0];
        text = filteredArgs.slice(1).join(" ");
      } else {
        // Format: !reply <id> "text"
        msgId = rawArgs[0];
        text = rawArgs.slice(1).join(" ");
      }

      if (!msgId || !text) {
        return msg.reply("❌ Nutzung: `!reply <id> \"text\"` oder `!reply #kanal <id> \"text\"`").then(m => setTimeout(() => m.delete(), 5000));
      }

      const targetChannel = channelMention || msg.channel;

      // Remove quotes if present
      text = text.trim();
      if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1);
      }

      try {
        const targetMsg = await targetChannel.messages.fetch(msgId);
        if (targetMsg.system) {
          // System messages cannot be replied to via Discord API
          // We send a normal message instead
          await targetChannel.send({
            content: text
          });
        } else {
          await targetMsg.reply(text);
        }
        console.log(`[REPLY] Von ${msg.author.username} auf Nachricht ${msgId} in ${targetChannel.name}: ${text}`);
      } catch (err) {
        console.error("[REPLY] Fehler beim Senden der Antwort:", err);
        await msg.reply("❌ Nachricht nicht gefunden oder Fehler beim Antworten. Stelle sicher, dass die ID korrekt ist.");
      }
    }
  });
}
