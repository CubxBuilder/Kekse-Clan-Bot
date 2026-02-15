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
    if (cmd === "news") {
      const channel = msg.mentions.channels.first();
      if (!channel) return;

      const mentionMatch = msg.content.match(/<#[0-9]+>/);
      if (!mentionMatch) return;
      
      const startIndex = mentionMatch.index + mentionMatch[0].length;
      let text = msg.content.slice(startIndex).trim();
      
      if (!text) return;

      const emojiMap = {
        "regles": "1467246063122649180",
        "mail": "1467246078226334040",
        "like": "1467246068235501733",
        "management": "1467246065437642999",
        "moins": "1467246060689690849",
        "info": "1467246059561685238",
        "web": "1467246058341142833",
        "dislike": "1467246057070268681",
        "logs": "1467246054910070938",
        "check": "1467246053911957759",
        "staff": "1467246044772569218",
        "lien": "1467246043182924040",
        "identifiant": "1467246041668780227",
        "cybersecurite": "1467246039731015794",
        "statistiques": "1467246038497886311",
        "administrateur": "1467246035922321478",
        "croix": "1467246034580410429",
        "certifier": "1467246033389092904",
        "supprimer": "1467246032181006499",
        "profil": "1467246030998343733",
        "moderateur": "1467246028758712575",
        "crayon": "1467246026846109821",
        "stats": "1467246025411658012",
        "ouvert": "1467246023872352358",
        "discordoff": "1467246022668583147",
        "warningicon": "1467246020445339875",
        "2nd": "1467246019556282533",
        "discordon": "1467246018218430696",
        "1st": "1467246016926453810",
        "help": "1467246015332618372",
        "timeout": "1467246013487255705",
        "unstableping": "1467246011578712186",
        "yinfo": "1467246010349785119",
        "3rd": "1467246008734847138",
        "failed": "1467246005870264352",
        "mute": "1467246003890425928",
        "verified": "1467246002628202507",
        "cross": "1467246000258420767",
        "interruption": "1467245998043824128",
        "checkmark": "1467245996584210554",
        "moderatorprogramsalumnia": "1467245995510337659",
        "pingeveryone": "1453800508329558218",
        "ping": "1453799622303813714",
        "pepecookie": "1453796363442585660"
      };

      const animatedEmojis = ["moderatorprogramsalumnia", "pingeveryone"];
      const emojiRegex = /:([a-zA-Z0-9_]+):/g;
      text = text.replace(emojiRegex, (match, name) => {
        if (emojiMap[name]) {
          const isAnimated = animatedEmojis.includes(name);
          return `<${isAnimated ? "a" : ""}:${name}:${emojiMap[name]}>`;
        }
        return match;
      });

      await channel.send(text);
    }

    if (cmd === "reply") {
      let channelMention = msg.mentions.channels.first();
      let msgId, text;

      const rawArgs = msg.content.slice(1).split(" ");
      rawArgs.shift(); // remove "reply"

      if (channelMention) {
        const filteredArgs = rawArgs.filter(arg => !arg.startsWith("<#"));
        msgId = filteredArgs[0];
        text = filteredArgs.slice(1).join(" ");
      } else {
        msgId = rawArgs[0];
        text = rawArgs.slice(1).join(" ");
      }

      if (!msgId || !text) {
        return msg.reply("❌ Nutzung: `!reply <id> \"text\"` oder `!reply #kanal <id> \"text\"`").then(m => setTimeout(() => m.delete(), 5000));
      }

      const targetChannel = channelMention || msg.channel;

      text = text.trim();
      if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1);
      }

      try {
        const targetMsg = await targetChannel.messages.fetch(msgId);
        if (targetMsg.system) {
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
