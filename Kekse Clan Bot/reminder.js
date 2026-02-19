import "dotenv/config";
import { EmbedBuilder } from "discord.js";
import { getData, setData } from "./remindersStorage.js";

const LOG_CHANNEL_ID = "1423413348220796991";

export function initReminder(client) {

  // Hilfsfunktion für Kekse Clan Logs
  const sendKekseLog = async (action, user, details) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;
    const logEmbed = new EmbedBuilder()
      .setColor('#ffffff')
      .setAuthor({ 
          name: user.username, 
          iconURL: user.displayAvatarURL({ size: 512 }) 
      })
      .setDescription(`**Aktion:** \`${action}\`\n${details}`)
      .setFooter({ text: 'Kekse Clan | Reminder System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };

  function parseDuration(str) {
    const match = str.match(/(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?/);
    if (!match) return 0;
    const days = parseInt(match[1] || "0");
    const hours = parseInt(match[2] || "0");
    const minutes = parseInt(match[3] || "0");
    return ((days * 24 + hours) * 60 + minutes) * 60000;
  }

  function parseAbsoluteTime(str) {
    const [timePart, datePart] = str.split(";");
    if (!timePart || !datePart) return null;
    const [hh, mm] = timePart.split(":").map(Number);
    const [dd, MM, YYYY] = datePart.split(".").map(Number);
    return new Date(YYYY, MM - 1, dd, hh, mm, 0).getTime();
  }

  async function checkReminders() {
    const data = getData("reminders") || { reminders: [] };
    if (data.reminders.length === 0) return;

    const now = Date.now();
    const remaining = [];
    let changed = false;

    for (const r of data.reminders) {
      if (now >= r.triggerAt) {
        changed = true;
        const user = await client.users.fetch(r.userId).catch(() => null);
        try {
          if (r.dm && user) {
            await user.send(`🔔 **Erinnerung:** ${r.text}`);
          } else {
            const channel = await client.channels.fetch(r.channelId).catch(() => null);
            if (channel) await channel.send(`🔔 <@${r.userId}> **Erinnerung:** ${r.text}`);
          }
          // Log: Erinnerung ausgelöst
          if (user) await sendKekseLog("Erinnerung ausgelöst", user, `**Inhalt:** ${r.text}\n**Typ:** ${r.dm ? "DM" : "Channel"}`);
        } catch (err) {
          console.error("[REMINDER] Fehler beim Senden:", err);
        }
      } else {
        remaining.push(r);
      }
    }

    if (changed) {
      data.reminders = remaining;
      await setData("reminders", data);
    }
  }

  setInterval(checkReminders, 60000);

  client.on("messageCreate", async msg => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;

    const args = msg.content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "remind") {
      if (args.length < 2) return msg.channel.send({ content: "❌ Nutzung: `!remind <Zeit/Dauer> <Text> [dm]`", ephemeral: true });

      const timeArg = args.shift();
      const dmFlag = args[args.length - 1]?.toLowerCase() === "dm";
      if (dmFlag) args.pop();
      const text = args.join(" ");

      let triggerAt = timeArg.includes(";") ? parseAbsoluteTime(timeArg) : (Date.now() + parseDuration(timeArg));

      if (!triggerAt || isNaN(triggerAt) || triggerAt <= Date.now()) {
        return msg.channel.send({ content: "❌ Ungültiger Zeitpunkt.", ephemeral: true });
      }

      const reminder = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        userId: msg.author.id,
        channelId: msg.channel.id,
        triggerAt,
        text,
        dm: dmFlag
      };

      const data = getData("reminders") || { reminders: [] };
      data.reminders.push(reminder);
      await setData("reminders", data);

      // Log: Erinnerung gesetzt
      await sendKekseLog("Erinnerung gesetzt", msg.author, `**Text:** ${text}\n**Zeitpunkt:** <t:${Math.floor(triggerAt / 1000)}:f>\n**DM:** ${dmFlag ? "Ja" : "Nein"}`);

      msg.channel.send({ content: `✅ Erinnerung gesetzt für <t:${Math.floor(triggerAt / 1000)}:R>!`, ephemeral: true });
    }
  });
}
