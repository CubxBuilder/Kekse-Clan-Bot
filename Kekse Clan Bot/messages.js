import { EmbedBuilder, PermissionsBitField } from "discord.js";

export function registerMessageCommands(client) {
  client.on("messageCreate", async msg => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    const teamRole = "1457906448234319922";
    if (!msg.member.roles.cache.has(teamRole) && !msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
    const args = msg.content.slice(1).match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "")) || [];
    const cmd = args.shift().toLowerCase();

    const deleteCmd = () => msg.delete().catch(() => {});

    if (cmd === "send") {
      await deleteCmd();
      const channel = msg.mentions.channels.first();
      const text = msg.content.replace(/^!send\s+<#[0-9]+>\s?/, "").trim();
      if (channel && text) await channel.send(text);
    }
    if (cmd === "changelog") {
      await deleteCmd();
      const changelogChannel = msg.guild.channels.cache.get("1464993818968588379");
      if (!changelogChannel || args.length === 0) return;
      const date = new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      const updateList = args.map(item => `- ${item}`).join("\n");
      const messageFormat = 
`<@&1464994942345547857>
**:wrench: Änderungen (${date})**
${updateList}`;
      await changelogChannel.send(messageFormat);
    }

    if (cmd === "embed") {
      await deleteCmd();
      const channel = msg.mentions.channels.first();
      const [_, title, text, color = "#ffffff"] = args;
      if (channel && title && text) {
        const embed = new EmbedBuilder().setTitle(title).setDescription(text).setColor(color);
        await channel.send({ embeds: [embed] });
      }
    }

    if (cmd === "dm") {
      await deleteCmd();
      const userId = args[0];
      const text = args.slice(1).join(" ");
      const user = await client.users.fetch(userId).catch(() => null);
      if (user && text) await user.send(text).catch(() => {});
    }

    if (cmd === "news") {
      await deleteCmd();
      const channel = msg.mentions.channels.first();
      if (!channel) return;

      let text = msg.content.replace(/^!news\s+<#[0-9]+>\s?/, "").trim();
      if (!text) return;

      const emojiMap = {
        "regles": "1467246063122649180", "mail": "1467246078226334040", "like": "1467246068235501733",
        "management": "1467246065437642999", "moins": "1467246060689690849", "info": "1467246059561685238",
        "web": "1467246058341142833", "dislike": "1467246057070268681", "logs": "1467246054910070938",
        "check": "1467246053911957759", "staff": "1467246044772569218", "lien": "1467246043182924040",
        "identifiant": "1467246041668780227", "cybersecurite": "1467246039731015794", "statistiques": "1467246038497886311",
        "administrateur": "1467246035922321478", "croix": "1467246034580410429", "certifier": "1467246033389092904",
        "supprimer": "1467246032181006499", "profil": "1467246030998343733", "moderateur": "1467246028758712575",
        "crayon": "1467246026846109821", "stats": "1467246025411658012", "ouvert": "1467246023872352358",
        "discordoff": "1467246022668583147", "warningicon": "1467246020445339875", "2nd": "1467246019556282533",
        "discordon": "1467246018218430696", "1st": "1467246016926453810", "help": "1467246015332618372",
        "timeout": "1467246013487255705", "unstableping": "1467246011578712186", "yinfo": "1467246010349785119",
        "3rd": "1467246008734847138", "failed": "1467246005870264352", "mute": "1467246003890425928",
        "verified": "1467246002628202507", "cross": "1467246000258420767", "interruption": "1467245998043824128",
        "checkmark": "1467245996584210554", "moderatorprogramsalumnia": "1467245995510337659",
        "pingeveryone": "1453800508329558218", "ping": "1453799622303813714", "pepecookie": "1453796363442585660"
      };

      text = text.replace(/:([a-zA-Z0-9_]+):/g, (match, name) => {
        if (emojiMap[name]) {
          const emoji = client.emojis.cache.get(emojiMap[name]);
          const isAnimated = emoji?.animated || ["moderatorprogramsalumnia", "pingeveryone"].includes(name);
          return `<${isAnimated ? "a" : ""}:${name}:${emojiMap[name]}>`;
        }
        return match;
      });

      await channel.send(text);
    }

    if (cmd === "reply") {
      await deleteCmd();
      const channelMention = msg.mentions.channels.first() || msg.channel;
      const msgId = args.find(a => /^\d{17,20}$/.test(a));
      let text = args.filter(a => !a.includes(msgId) && !a.startsWith("<#")).join(" ");

      if (!msgId || !text) return;

      try {
        const targetMsg = await channelMention.messages.fetch(msgId);
        targetMsg.system ? await channelMention.send(text) : await targetMsg.reply(text);
      } catch (err) {
        await msg.channel.send("❌ Nachricht nicht gefunden.").then(m => setTimeout(() => m.delete(), 3000));
      }
    }
  });
}
