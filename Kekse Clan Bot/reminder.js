import "dotenv/config";
import { getData, setData } from "./remindersStorage.js";

export function initReminder(client) {

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
    const date = new Date(YYYY, MM - 1, dd, hh, mm, 0);
    return date.getTime();
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
        try {
          if (r.dm) {
            const user = await client.users.fetch(r.userId).catch(() => null);
            if (user) await user.send(`🔔 **Erinnerung:** ${r.text}`);
          } else {
            const channel = await client.channels.fetch(r.channelId).catch(() => null);
            if (channel) await channel.send(`🔔 <@${r.userId}> **Erinnerung:** ${r.text}`);
          }
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
      if (args.length < 2) return msg.channel.send({content: "❌ Nutzung: `!remind <Zeit/Dauer> <Text> [dm]`\nBeispiele: `!remind 2h30m Tee kochen` oder `!remind 18:00;24.12.2024 Geschenke dm` ",
        ephemeral: true 
                                   });

      const timeArg = args.shift();
      const dmFlag = args[args.length - 1]?.toLowerCase() === "dm";
      if (dmFlag) args.pop();
      const text = args.join(" ");

      let triggerAt = 0;
      if (timeArg.includes(";")) {
        triggerAt = parseAbsoluteTime(timeArg);
      } else {
        const duration = parseDuration(timeArg);
        if (duration > 0) triggerAt = Date.now() + duration;
      }

      if (!triggerAt || isNaN(triggerAt) || triggerAt <= Date.now()) {
        return msg.channel.send({content: "❌ Ungültiges Zeitformat oder Zeitpunkt in der Vergangenheit.",
        ephemeral: true 
                                   });
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

      console.log(`[REMINDER] ${msg.author.username} erinnert sich um <t:${Math.floor(triggerAt / 1000)}:f>`);
      msg.channel.send({content: `✅ Erinnerung gesetzt für <t:${Math.floor(triggerAt / 1000)}:R>!`,
        ephemeral: true 
                                   });
    }
  });
}
