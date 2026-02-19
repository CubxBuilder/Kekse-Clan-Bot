import { EmbedBuilder, Events } from "discord.js";
import { getData, setData } from "./countingStorage.js";

const COUNTING_CHANNEL = "1423434079390535730";

let countingData = {
  currentNumber: 1,
  lastUserId: null,
  lastCountingTime: null,
  scoreboard: {}
};

function loadCounting() {
  const stored = getData("counting");
  if (stored) {
    countingData = stored;
  } else {
    saveCounting();
  }
}

async function saveCounting() {
  await setData("counting", countingData);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function initCounting(client) {
  const runSync = async () => {
    console.log("🔄 Starte Counting-Synchronisation...");
    loadCounting();
    const channel = await client.channels.fetch(COUNTING_CHANNEL).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.log("❌ Counting-Kanal nicht gefunden oder nicht textbasiert.");
      return;
    }

    let lastNumber = countingData.currentNumber - 1;
    let lastUser = countingData.lastUserId;
    let lastTime = countingData.lastCountingTime ?? 0;
    let lastId;
    let allMessages = [];

    console.log(`🔍 Suche nach verpassten Nachrichten seit ${new Date(lastTime).toLocaleString()}...`);

    try {
      while (true) {
        const msgs = await channel.messages.fetch({ limit: 100, before: lastId });
        if (!msgs || msgs.size === 0) break;
        lastId = msgs.last().id;

        for (const m of msgs.values()) {
          if (!m.author.bot && m.createdTimestamp > lastTime) {
            allMessages.push(m);
          }
        }
        
        if (msgs.some(m => m.createdTimestamp <= lastTime)) break;
      }
    } catch (err) {
      console.error("❌ Fehler beim Abrufen der Nachrichten:", err);
    }

    if (allMessages.length > 0) {
      console.log(`📥 ${allMessages.length} verpasste Nachrichten gefunden. Verarbeite...`);
      allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      for (const msg of allMessages) {
        const match = msg.content.trim().match(/^\d+/);
        if (!match) continue;
        const num = parseInt(match[0]);

        if (msg.author.id === lastUser || num !== lastNumber + 1) {
          console.log(`❌ Nachgeholt: Falsche Zahl (${num} statt ${lastNumber + 1}) oder Doppel-Post von ${msg.author.username}. Reset auf 1.`);
          await msg.react("❌").catch(() => {});
          lastNumber = 0;
          lastUser = null;
          lastTime = msg.createdTimestamp;
          continue;
        }

        console.log(`✅ Nachgeholt: ${msg.author.username} zählte ${num}.`);
        await msg.react("✅").catch(() => {});
        lastNumber = num;
        lastUser = msg.author.id;
        lastTime = msg.createdTimestamp;
        countingData.scoreboard[msg.author.id] ??= 0;
        countingData.scoreboard[msg.author.id]++;
      }

      countingData.currentNumber = lastNumber + 1;
      countingData.lastUserId = lastUser;
      countingData.lastCountingTime = lastTime;
      saveCounting();
      console.log(`✨ Synchronisation abgeschlossen. Aktuelle Zahl: ${countingData.currentNumber}`);
    } else {
      console.log("✅ Keine verpassten Nachrichten gefunden.");
    }
  };

  if (client.isReady()) {
    runSync();
  } else {
    client.once(Events.ClientReady, runSync);
  }

  client.on(Events.MessageCreate, async msg => {
    if (msg.author.bot) return;
    if (msg.channel.id !== COUNTING_CHANNEL) return;

    loadCounting();

    if (msg.content === "!top") {
      const sorted = Object.entries(countingData.scoreboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 10 Counter")
        .setDescription(
          sorted.map(([id, s], i) => `${i + 1}. <@${id}> • ${s}`).join("\n") || "Keine Daten"
        )
        .setColor(0xffffff);

      await msg.reply({ embeds: [embed] });
      return;
    }

    const match = msg.content.trim().match(/^\d+/);
    if (!match) {
      if (msg.content.startsWith("!set_number")) {
        if (msg.author.id !== "1151971830983311441") return;
        const args = msg.content.split(" ");
        const newNum = parseInt(args[1]);
        if (isNaN(newNum)) return msg.reply("❌ Bitte eine gültige Zahl angeben.");
        countingData.currentNumber = newNum;
        saveCounting();
        return msg.reply(`✅ Die nächste Zahl wurde auf **${newNum}** gesetzt.`);
      }
      return;
    }
    const num = parseInt(match[0]);

    if (num !== countingData.currentNumber) {
      console.log(`❌ Fehler: ${msg.author.username} schrieb ${num} statt ${countingData.currentNumber}. Reset.`);
      countingData.currentNumber = 1;
      countingData.lastUserId = null;
      countingData.lastCountingTime = msg.createdTimestamp;
      saveCounting();
      await msg.react("❌");
      await msg.reply("❌ <@" + msg.author.id + "> hat falsch gezählt! Das Spiel fängt wieder bei 1 an.");
      return;
    } else if (msg.author.id === countingData.lastUserId) {
      console.log(`❌ Fehler: ${msg.author.username} versuchte doppelt zu zählen (${num}). Reset.`);
      countingData.currentNumber = 1;
      countingData.lastUserId = null;
      countingData.lastCountingTime = msg.createdTimestamp;
      saveCounting();
      await msg.react("❌");
      await msg.reply("❌ <@" + msg.author.id + ">, du darfst nicht zwei mal nacheinander zählen! Das Spiel fängt wieder bei 1 an.");
      return;
    }

    countingData.currentNumber = num + 1;
    countingData.lastUserId = msg.author.id;
    countingData.lastCountingTime = msg.createdTimestamp;
    
    const excludedUsers = ["1151971830983311441", "1274320881585356892"];
    if (!excludedUsers.includes(msg.author.id)) {
      countingData.scoreboard[msg.author.id] ??= 0;
      countingData.scoreboard[msg.author.id]++;
      console.log(`✅ Korrekt: ${msg.author.username} zählte ${num}. Nächste Zahl: ${num + 1}`);
    } else {
      console.log(`✅ Korrekt: ${msg.author.username} zählte ${num} (ausgeschlossen vom Scoreboard).`);
    }
    saveCounting();
    await msg.react("✅");
    
  });
}

loadCounting();
