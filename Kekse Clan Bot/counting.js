import { EmbedBuilder, Events } from "discord.js";
import { getData, setData } from "./countingStorage.js";

const COUNTING_CHANNEL = "1423434079390535730";
const LOG_CHANNEL_ID = "1423413348220796991";

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

export async function initCounting(client) {
  
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
      .setFooter({ text: 'Kekse Clan | Counting System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };

  const runSync = async () => {
    console.log("🔄 Starte Counting-Synchronisation...");
    loadCounting();
    const channel = await client.channels.fetch(COUNTING_CHANNEL).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    let lastNumber = countingData.currentNumber - 1;
    let lastUser = countingData.lastUserId;
    let lastTime = countingData.lastCountingTime ?? 0;
    let lastId;
    let allMessages = [];

    try {
      while (true) {
        const msgs = await channel.messages.fetch({ limit: 100, before: lastId });
        if (!msgs || msgs.size === 0) break;
        lastId = msgs.last().id;
        for (const m of msgs.values()) {
          if (!m.author.bot && m.createdTimestamp > lastTime) allMessages.push(m);
        }
        if (msgs.some(m => m.createdTimestamp <= lastTime)) break;
      }
    } catch (err) { console.error(err); }

    if (allMessages.length > 0) {
      allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      for (const msg of allMessages) {
        const match = msg.content.trim().match(/^\d+/);
        if (!match) continue;
        const num = parseInt(match[0]);

        if (msg.author.id === lastUser || num !== lastNumber + 1) {
          lastNumber = 0;
          lastUser = null;
          lastTime = msg.createdTimestamp;
          continue;
        }
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
    }
  };

  if (client.isReady()) runSync(); else client.once(Events.ClientReady, runSync);

  client.on(Events.MessageCreate, async msg => {
    if (msg.author.bot) return;
    if (msg.channel.id !== COUNTING_CHANNEL) return;

    loadCounting();

    // Scoreboard Command
    if (msg.content === "!top") {
      const sorted = Object.entries(countingData.scoreboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 10 Counter")
        .setDescription(sorted.map(([id, s], i) => `${i + 1}. <@${id}> • ${s}`).join("\n") || "Keine Daten")
        .setColor('#ffffff')
        .setFooter({ text: 'Kekse Clan' });

      await msg.reply({ embeds: [embed] });
      return;
    }

    const match = msg.content.trim().match(/^\d+/);
    
    // Admin Override
    if (!match && msg.content.startsWith("!set_number")) {
        if (msg.author.id !== "1151971830983311441") return;
        const args = msg.content.split(" ");
        const newNum = parseInt(args[1]);
        if (isNaN(newNum)) return;
        countingData.currentNumber = newNum;
        saveCounting();
        await sendKekseLog("Counting Reset (Admin)", msg.author, `Die Zahl wurde manuell auf **${newNum}** gesetzt.`);
        return msg.reply(`✅ Die nächste Zahl wurde auf **${newNum}** gesetzt.`);
    }

    if (!match) return;
    const num = parseInt(match[0]);

    // Fehler-Logik (Falsche Zahl oder Doppel-Post)
    if (num !== countingData.currentNumber || msg.author.id === countingData.lastUserId) {
      const reason = num !== countingData.currentNumber ? `Falsche Zahl (${num} statt ${countingData.currentNumber})` : "Doppel-Post";
      
      await sendKekseLog("Counting Fehler", msg.author, `**Grund:** ${reason}\n**Reset auf:** 1`);
      
      countingData.currentNumber = 1;
      countingData.lastUserId = null;
      countingData.lastCountingTime = msg.createdTimestamp;
      saveCounting();
      
      await msg.react("❌");
      const replyContent = num !== countingData.currentNumber 
        ? `❌ <@${msg.author.id}> hat falsch gezählt! Zurück auf 1.` 
        : `❌ <@${msg.author.id}>, nicht zwei mal nacheinander! Zurück auf 1.`;
      return msg.reply(replyContent);
    }

    // Erfolgreiches Zählen
    countingData.currentNumber = num + 1;
    countingData.lastUserId = msg.author.id;
    countingData.lastCountingTime = msg.createdTimestamp;
    
    const excludedUsers = ["1151971830983311441", "1274320881585356892"];
    if (!excludedUsers.includes(msg.author.id)) {
      countingData.scoreboard[msg.author.id] ??= 0;
      countingData.scoreboard[msg.author.id]++;
    }
    
    saveCounting();
    await msg.react("✅");
  });
}

loadCounting();
