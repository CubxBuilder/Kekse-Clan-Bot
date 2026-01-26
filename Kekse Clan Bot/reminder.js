import "dotenv/config";
import { getData, setData } from "./storage.js";

export function initReminder(client) {

  function parseDuration(str) {
    const match = str.match(/(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?/);
    if (!match) return 0;
    const days = parseInt(match[1] || "0");
    const hours = parseInt(match[2] || "0");
    const minutes = parseInt(match[3] || "0");
    return ((days*24 + hours)*60 + minutes)*60000;
  }

  function parseAbsoluteTime(str) {
    // mm:hh;TT.MM.YYYY
    const [timePart, datePart] = str.split(";");
    if (!timePart || !datePart) return null;
    const [mm, hh] = timePart.split(":").map(Number);
    const [dd, MM, YYYY] = datePart.split(".").map(Number);
    const date = new Date(YYYY, MM-1, dd, hh, mm, 0);
    return date;
  }

  async function scheduleReminder(reminder, client) {
    const now = Date.now();
    let delay = 0;
    if (reminder.type === "duration") {
      delay = parseDuration(reminder.time);
    } else if (reminder.type === "absolute") {
      const date = parseAbsoluteTime(reminder.time);
      if (!date) return;
      delay = date.getTime() - now;
    }
    if (delay <= 0) return;

    setTimeout(async () => {
      try {
        if (reminder.dm) {
          const user = await client.users.fetch(reminder.userId);
          user.send(reminder.text).catch(() => {});
        } else {
          const channel = await client.channels.fetch(reminder.channelId);
          channel.send(reminder.text).catch(() => {});
        }
      } catch {}
      let data = getData("reminders") || { reminders: [] };
      data.reminders = data.reminders.filter(r => r.id !== reminder.id);
      await setData("reminders", data);
    }, delay);
  }

  const data = getData("reminders") || { reminders: [] };
  for (const r of data.reminders) scheduleReminder(r, client);

  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!")) return;
    if (!msg.member.roles.cache.has("1457906448234319922")) return;

    const args = msg.content.slice(1).split(" ");
    const cmd = args.shift().toLowerCase();

    if (cmd === "remind") {
      if (args.length < 2) return msg.channel.send("❌ Nutzung: !remind <time|duration> <text> [dm]");

      const timeArg = args.shift();
      const dmFlag = args[args.length-1].toLowerCase() === "dm";
      if (dmFlag) args.pop();

      const text = args.join(" ");
      let type = "duration";
      if (timeArg.includes(";")) type = "absolute";

      const id = Date.now() + Math.floor(Math.random()*1000);

      const reminder = {
        id,
        userId: msg.author.id,
        channelId: msg.channel.id,
        type,
        time: timeArg,
        text,
        dm: dmFlag
      };

      let data = getData("reminders") || { reminders: [] };
      data.reminders.push(reminder);
      await setData("reminders", data);

      scheduleReminder(reminder, client);
      console.log(`[REMINDER] Gesetzt von ${msg.author.username} (${msg.author.id}): ${text} in ${timeArg} (DM: ${dmFlag})`);

      msg.channel.send(`✅ Erinnerung gesetzt ${dmFlag ? "(per DM)" : ""}`);
    }
  });
}
