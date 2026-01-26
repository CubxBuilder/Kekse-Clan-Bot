import { PermissionsBitField } from "discord.js";
import { getData, setData } from "./storage.js";

function hasPerm(member) {
  return member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
}

export function initModeration(client) {

  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;
    if (!msg.member.roles.cache.has("1457906448234319922")) return;
    if (!msg.content.startsWith("!")) return;
    if (!hasPerm(msg.member)) return;

    const args = msg.content.slice(1).split(" ");
    const cmd = args.shift();

    let data = getData("moderation") || { warns: {} };

    const getUser = async () => {
      if (msg.mentions.users.first()) return msg.mentions.users.first();
      return await msg.guild.members.fetch({ query: args[0], limit: 1 })
        .then(m => m.first()?.user)
        .catch(() => null);
    };

    if (cmd === "timeout") {
      const user = await getUser();
      const durationStr = args[1];
      const reason = args.slice(2).join(" ") || "Kein Grund";

      if (!user) return msg.reply("❌ User nicht gefunden.");
      
      let durationMs = 0;
      if (durationStr) {
        const match = durationStr.match(/^(\d+)([smh])$/);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2];
          switch(unit) {
            case "s": durationMs = amount * 1000; break;
            case "m": durationMs = amount * 60 * 1000; break;
            case "h": durationMs = amount * 60 * 60 * 1000; break;
          }
        } else {
          durationMs = parseInt(durationStr) * 1000; // Default to seconds if only number
        }
      }

      if (isNaN(durationMs) || durationMs <= 0) return msg.reply("❌ Ungültige Dauer. Beispiel: 60s, 10m, 1h");

      try {
        const member = await msg.guild.members.fetch(user.id);
        await member.timeout(durationMs, reason);
        console.log(`[MOD] Timeout: ${user.username} (${user.id}) für ${durationStr || (durationMs/1000 + "s")} von ${msg.author.username}. Grund: ${reason}`);
        await msg.reply(`✅ Timeout gesetzt für <@${user.id}> (${durationStr || (durationMs/1000 + "s")}) wegen: ${reason}`);
      } catch (err) {
        console.error(err);
        await msg.reply("❌ Fehler beim Setzen des Timeouts. (Fehlende Rechte?)");
      }
    }

    if (cmd === "untimeout") {
      const user = await getUser();
      const reason = args.slice(1).join(" ") || "Kein Grund";

      if (!user) return msg.reply("❌ User nicht gefunden.");
      try {
        const member = await msg.guild.members.fetch(user.id);
        await member.timeout(null, reason);
        console.log(`[MOD] Untimeout: ${user.username} (${user.id}) von ${msg.author.username}. Grund: ${reason}`);
        await msg.reply(`✅ Timeout entfernt für <@${user.id}> wegen: ${reason}`);
      } catch (err) {
        console.error(err);
        await msg.reply("❌ Fehler beim Entfernen des Timeouts.");
      }
    }

    if (cmd === "kick") {
      const user = await getUser();
      const reason = args.slice(1).join(" ") || "Kein Grund";

      if (!user) return msg.reply("❌ User nicht gefunden.");
      try {
        await msg.guild.members.kick(user.id, reason);
        console.log(`[MOD] Kick: ${user.username} (${user.id}) von ${msg.author.username}. Grund: ${reason}`);
        await msg.reply(`✅ <@${user.id}> gekickt wegen: ${reason}`);
      } catch (err) {
        console.error(err);
        await msg.reply("❌ Fehler beim Kicken.");
      }
    }

    if (cmd === "ban") {
      const user = await getUser();
      const reason = args.slice(1).join(" ") || "Kein Grund";

      if (!user && !args[0]) return msg.reply("❌ Bitte User oder ID angeben.");
      const id = user ? user.id : args[0];

      try {
        await msg.guild.members.ban(id, { reason });
        console.log(`[MOD] Ban: ${id} von ${msg.author.username}. Grund: ${reason}`);
        await msg.reply(`✅ ${id} gebannt wegen: ${reason}`);
      } catch (err) {
        console.error(err);
        await msg.reply("❌ Fehler beim Bannen.");
      }
    }

    if (cmd === "unban") {
      const id = args[0];
      const reason = args.slice(1).join(" ") || "Kein Grund";
      
      if (!id) return msg.reply("❌ Bitte ID angeben.");

      try {
        await msg.guild.members.unban(id, reason);
        console.log(`[MOD] Unban: ${id} von ${msg.author.username}. Grund: ${reason}`);
        await msg.reply(`✅ ID ${id} entbannt wegen: ${reason}`);
      } catch (err) {
        console.error(err);
        await msg.reply("❌ Fehler beim Entbannen (ID falsch oder nicht gebannt?).");
      }
    }

    if (cmd === "warn") {
      const user = await getUser();
      const reason = args.slice(1).join(" ") || "Kein Grund";

      if (!user) return;

      data.warns[user.id] ??= [];
      data.warns[user.id].push({
        reason,
        by: msg.author.id,
        date: Date.now()
      });

      await setData("moderation", data);
      await msg.reply("Warnung hinzugefügt.");
    }

    if (cmd === "warns") {
      const user = await getUser();
      if (!user) return;

      const warns = data.warns[user.id] || [];
      if (warns.length === 0) {
        await msg.reply("Keine Warnungen.");
        return;
      }

      const text = warns
        .map((w, i) => `${i + 1}. ${w.reason}`)
        .join("\n");

      await msg.reply(text);
    }

    if (cmd === "warn_remove") {
      const user = await getUser();
      const index = parseInt(args[1]) - 1;

      if (!user) return;
      if (!data.warns[user.id]) return;

      data.warns[user.id].splice(index, 1);
      await setData("moderation", data);

      await msg.reply("Warnung entfernt.");
    }
  });
}
