import { PermissionsBitField, EmbedBuilder } from "discord.js";
import { getData, setData } from "./moderationStorage.js";

const LOG_CHANNEL_ID = "1423413348220796991";
const TEAM_ROLE_ID = "1457906448234319922";

function hasPerm(member) {
  return member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
}

export function initModeration(client) {
  client.on("messageCreate", async msg => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID) || !hasPerm(msg.member)) return;

    const args = msg.content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();
    let data = getData("moderation") || { warns: {} };

    const getUser = async (input) => {
      if (!input) return null;
      const id = input.replace(/[<@!>]/g, "");
      if (/^\d{17,20}$/.test(id)) return await client.users.fetch(id).catch(() => null);
      return null;
    };

    // IMPLEMENTIERT: Kekse Clan Log-Design
    const sendModLog = async (action, target, reason, extra = null) => {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (!logChannel) return;

      const kekseEmbed = new EmbedBuilder()
        .setColor('#ffffff')
        .setAuthor({ 
            name: msg.author.username, 
            iconURL: msg.author.displayAvatarURL({ size: 512 }) 
        })
        .setTitle(`🛠️ Mod-Aktion: ${action}`)
        .setDescription(`**Target:** ${target.tag || target.id} (\`${target.id}\`)\n**Grund:** ${reason}${extra ? `\n**Info:** ${extra}` : ""}`)
        .setFooter({ text: 'Kekse Clan | Moderation Logs' })
        .setTimestamp();

      await logChannel.send({ embeds: [kekseEmbed] }).catch(() => {});
    };

    if (cmd === "timeout") {
      const user = await getUser(args[0]);
      const durationStr = args[1];
      const reason = args.slice(2).join(" ") || "Kein Grund";
      if (!user || !durationStr) return msg.reply({ content: "❌ Syntax: `!timeout @user 10m Grund`.", ephemeral: true });

      const match = durationStr.match(/^(\d+)([smhd])$/);
      if (!match) return msg.reply({ content: "❌ Format: 10s, 5m, 2h, 1d", ephemeral: true });
      const durationMs = parseDuration(match[1], match[2]);

      try {
        const member = await msg.guild.members.fetch(user.id);
        await member.timeout(durationMs, reason);
        await sendModLog("Timeout", user, reason, `Dauer: ${durationStr}`);
        await msg.reply({ content: `✅ **Timeout**: <@${user.id}> für ${durationStr}.`, ephemeral: true });
      } catch (err) { 
        await msg.reply({ content: "❌ Fehler: User nicht auf Server oder fehlende Rechte.", ephemeral: true }); 
      }
    }

    if (cmd === "untimeout") {
      const user = await getUser(args[0]);
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!user) return msg.reply({ content: "❌ User nicht gefunden.", ephemeral: true });

      try {
        const member = await msg.guild.members.fetch(user.id);
        await member.timeout(null, reason);
        await sendModLog("Untimeout", user, reason);
        await msg.reply({ content: `✅ **Untimeout**: <@${user.id}>`, ephemeral: true });
      } catch (err) { 
        await msg.reply({ content: "❌ Fehler beim Untimeout.", ephemeral: true }); 
      }
    }

    if (cmd === "kick") {
      const user = await getUser(args[0]);
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!user) return msg.reply({ content: "❌ User nicht gefunden.", ephemeral: true });

      try {
        await msg.guild.members.kick(user.id, reason);
        await sendModLog("Kick", user, reason);
        await msg.reply({ content: `✅ **Kick**: <@${user.id}>`, ephemeral: true });
      } catch (err) { 
        await msg.reply({ content: "❌ Fehler beim Kick.", ephemeral: true }); 
      }
    }

    if (cmd === "ban") {
      const idInput = args[0]?.replace(/[<@!>]/g, "");
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!idInput || !/^\d{17,20}$/.test(idInput)) return msg.reply({ content: "❌ Gültige ID/Erwähnung angeben.", ephemeral: true });

      try {
        const user = await client.users.fetch(idInput).catch(() => ({ id: idInput, tag: "Unknown#0000" }));
        await msg.guild.members.ban(idInput, { reason });
        await sendModLog("Ban", user, reason);
        await msg.reply({ content: `✅ **Ban**: ${user.tag || idInput} wurde gebannt.`, ephemeral: true });
      } catch (err) { 
        await msg.reply({ content: "❌ Fehler beim Ban (Rechte?).", ephemeral: true }); 
      }
    }

    if (cmd === "unban") {
      const idInput = args[0]?.replace(/[<@!>]/g, "");
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!idInput) return msg.reply({ content: "❌ ID angeben.", ephemeral: true });

      try {
        const user = await client.users.fetch(idInput).catch(() => ({ id: idInput, tag: idInput }));
        await msg.guild.members.unban(idInput, reason);
        await sendModLog("Unban", user, reason);
        await msg.reply({ content: `✅ **Unban**: ${user.tag || idInput}`, ephemeral: true });
      } catch (err) { 
        await msg.reply({ content: "❌ User nicht gebannt oder ID falsch.", ephemeral: true }); 
      }
    }

    if (cmd === "warn") {
      const user = await getUser(args[0]);
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!user) return msg.reply({ content: "❌ User nicht gefunden.", ephemeral: true });

      data.warns[user.id] ??= [];
      data.warns[user.id].push({ reason, by: msg.author.id, date: Date.now() });
      await setData("moderation", data);
      
      await sendModLog("Warnung", user, reason, `Warn-Stand: ${data.warns[user.id].length}`);
      await msg.reply({ content: `⚠️ **Warn**: <@${user.id}> (Gesamt: ${data.warns[user.id].length})`, ephemeral: true });
    }

    if (cmd === "warns") {
      const user = await getUser(args[0]);
      if (!user) return msg.reply({ content: "❌ User nicht gefunden.", ephemeral: true });
      const userWarns = data.warns[user.id] || [];
      if (userWarns.length === 0) return msg.reply({ content: "✅ Keine Warnungen.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`Warnungen: ${user.username}`)
        .setColor('#ffffff')
        .setDescription(userWarns.map((w, i) => `**${i + 1}.** ${w.reason} (von <@${w.by}>)`).join("\n"))
        .setFooter({ text: 'Kekse Clan' });
      await msg.reply({ embeds: [embed] });
    }

    if (cmd === "warn_remove") {
      const user = await getUser(args[0]);
      const index = parseInt(args[1]) - 1;
      if (!user || isNaN(index) || !data.warns[user.id]?.[index]) return msg.reply({ content: "❌ Ungültiger Index.", ephemeral: true });

      const removed = data.warns[user.id].splice(index, 1);
      await setData("moderation", data);
      await sendModLog("Warn entfernt", user, `Grund war: ${removed[0].reason}`);
      await msg.reply({ content: "✅ Warnung entfernt.", ephemeral: true });
    }
  });
}

function parseDuration(amount, unit) {
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(amount) * map[unit];
}
