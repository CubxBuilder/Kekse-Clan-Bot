import { PermissionsBitField, EmbedBuilder } from "discord.js";
import { getData, setData } from "./storage.js";

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

    const sendModLog = async (action, target, reason, extra = null) => {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`Mod-Aktion: ${action}`)
        .setColor(action.includes("Warn") ? 0xffa500 : 0xff0000)
        .addFields(
          { name: "Target", value: `${target.tag || target.id} (${target.id})`, inline: true },
          { name: "Moderator", value: `${msg.author.tag}`, inline: true },
          { name: "Grund", value: reason }
        )
        .setTimestamp();

      if (extra) embed.addFields({ name: "Info", value: extra });
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    };

    if (cmd === "timeout") {
      const user = await getUser(args[0]);
      const durationStr = args[1];
      const reason = args.slice(2).join(" ") || "Kein Grund";
      if (!user || !durationStr) return msg.reply("❌ Syntax: `!timeout @user 10m Grund`.");

      const match = durationStr.match(/^(\d+)([smhd])$/);
      if (!match) return msg.reply("❌ Format: 10s, 5m, 2h, 1d");
      const durationMs = parseDuration(match[1], match[2]);

      try {
        const member = await msg.guild.members.fetch(user.id);
        await member.timeout(durationMs, reason);
        await sendModLog("Timeout", user, reason, `Dauer: ${durationStr}`);
        await msg.reply(`✅ **Timeout**: <@${user.id}> für ${durationStr}.`);
      } catch (err) { await msg.reply("❌ Fehler: User nicht auf Server oder fehlende Rechte."); }
    }

    if (cmd === "untimeout") {
      const user = await getUser(args[0]);
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!user) return msg.reply("❌ User nicht gefunden.");

      try {
        const member = await msg.guild.members.fetch(user.id);
        await member.timeout(null, reason);
        await sendModLog("Untimeout", user, reason);
        await msg.reply(`✅ **Untimeout**: <@${user.id}>`);
      } catch (err) { await msg.reply("❌ Fehler beim Untimeout."); }
    }

    if (cmd === "kick") {
      const user = await getUser(args[0]);
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!user) return msg.reply("❌ User nicht gefunden.");

      try {
        await msg.guild.members.kick(user.id, reason);
        await sendModLog("Kick", user, reason);
        await msg.reply(`✅ **Kick**: <@${user.id}>`);
      } catch (err) { await msg.reply("❌ Fehler beim Kick."); }
    }

    if (cmd === "ban") {
      const idInput = args[0]?.replace(/[<@!>]/g, "");
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!idInput || !/^\d{17,20}$/.test(idInput)) return msg.reply("❌ Gültige ID/Erwähnung angeben.");

      try {
        const user = await client.users.fetch(idInput).catch(() => ({ id: idInput, tag: "Unknown#0000" }));
        await msg.guild.members.ban(idInput, { reason });
        await sendModLog("Ban (ID-Ban)", user, reason);
        await msg.reply(`✅ **Ban**: ${user.tag || idInput} wurde gebannt.`);
      } catch (err) { await msg.reply("❌ Fehler beim Ban (Rechte?)."); }
    }

    if (cmd === "unban") {
      const idInput = args[0]?.replace(/[<@!>]/g, "");
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!idInput) return msg.reply("❌ ID angeben.");

      try {
        const user = await client.users.fetch(idInput).catch(() => ({ id: idInput, tag: idInput }));
        await msg.guild.members.unban(idInput, reason);
        await sendModLog("Unban", user, reason);
        await msg.reply(`✅ **Unban**: ${user.tag || idInput}`);
      } catch (err) { await msg.reply("❌ User nicht gebannt oder ID falsch."); }
    }

    if (cmd === "warn") {
      const user = await getUser(args[0]);
      const reason = args.slice(1).join(" ") || "Kein Grund";
      if (!user) return msg.reply("❌ User nicht gefunden.");

      data.warns[user.id] ??= [];
      data.warns[user.id].push({ reason, by: msg.author.id, date: Date.now() });
      await setData("moderation", data);
      
      await sendModLog("Warnung", user, reason, `Warn-Stand: ${data.warns[user.id].length}`);
      await msg.reply(`⚠️ **Warn**: <@${user.id}> (Gesamt: ${data.warns[user.id].length})`);
    }

    if (cmd === "warns") {
      const user = await getUser(args[0]);
      if (!user) return msg.reply("❌ User nicht gefunden.");
      const userWarns = data.warns[user.id] || [];
      if (userWarns.length === 0) return msg.reply("✅ Keine Warnungen.");

      const embed = new EmbedBuilder()
        .setTitle(`Warnungen: ${user.username}`)
        .setColor(0xffa500)
        .setDescription(userWarns.map((w, i) => `**${i + 1}.** ${w.reason} (von <@${w.by}>)`).join("\n"));
      await msg.reply({ embeds: [embed] });
    }

    if (cmd === "warn_remove") {
      const user = await getUser(args[0]);
      const index = parseInt(args[1]) - 1;
      if (!user || isNaN(index) || !data.warns[user.id]?.[index]) return msg.reply("❌ Ungültiger Index.");

      const removed = data.warns[user.id].splice(index, 1);
      await setData("moderation", data);
      await sendModLog("Warn entfernt", user, `Grund war: ${removed[0].reason}`);
      await msg.reply("✅ Warnung entfernt.");
    }
  });
}

function parseDuration(amount, unit) {
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(amount) * map[unit];
}
