import { EmbedBuilder } from "discord.js";
import { getData, setData } from "./pollsStorage.js";

const TEAM_ROLE_ID = "1457906448234319922";

export function initPoll(client) {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    
    const args = msg.content.slice(1).match(/(?:[^\s,"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "").trim()) || [];
    const cmd = args.shift()?.toLowerCase();

    if (cmd === "poll") {
      if (!msg.member.roles.cache.has(TEAM_ROLE_ID))
        return msg.channel.send("❌ Du hast keine Berechtigung, eine Umfrage zu starten.");
        
      if (args.length < 4) return msg.reply("❌ Nutzung: `!poll \"Frage\" \"Minuten\" \"Beschreibung\" \"Antwort 1\" \"Antwort 2\" ...` (min. 2 Antworten)");

      const [question, timeStr, description, ...options] = args;
      const time = parseInt(timeStr);

      if (isNaN(time) || options.length < 2 || options.length > 10) {
        return msg.reply("❌ Ungültige Parameter. Min. 2 Antworten, Max. 10.");
      }

      const pollId = msg.id;
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const pollOptions = options.map((opt, i) => ({ text: opt, emoji: emojis[i], votes: 0 }));

      const endTime = Date.now() + time * 60000;
      const pollContent = createPollText(question, description, pollOptions, endTime, 0, pollId, msg.author);

      const pollMsg = await msg.channel.send(pollContent);
      for (let i = 0; i < pollOptions.length; i++) {
        await pollMsg.react(pollOptions[i].emoji).catch(() => {});
      }

      const polls = getData("polls_data") || [];
      polls.push({
        id: pollId,
        messageId: pollMsg.id,
        channelId: msg.channel.id,
        question,
        description,
        options: pollOptions,
        endTime,
        creatorId: msg.author.id,
        voters: [],
        closed: false
      });
      await setData("polls_data", polls);
    }

    if (cmd === "closepoll") {
      if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) return;
      const pollId = args[0]; // ID als String behandeln
      const polls = getData("polls_data") || [];
      const poll = polls.find(p => p.id === pollId && !p.closed);
      
      if (!poll) return msg.reply("❌ Poll nicht gefunden oder bereits geschlossen.");
      await closePoll(client, poll, polls);
    }

    if (cmd === "listpolls") {
      const polls = getData("polls_data") || [];
      const activePolls = polls.filter(p => !p.closed);
      if (activePolls.length === 0) return msg.reply("Keine aktiven Polls.");

      const list = activePolls.map(p => `ID: \`${p.id}\` | ${p.question}`).join("\n");
      msg.reply(`<#1467246038497886311> **Aktive Polls:**\n${list}`);
    }
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    let polls = getData("polls_data") || [];
    const poll = polls.find(p => p.messageId === reaction.message.id && !p.closed);
    if (!poll) return;

    const option = poll.options.find(o => o.emoji === reaction.emoji.name);
    if (!option || poll.voters.includes(user.id)) {
      return reaction.users.remove(user.id).catch(() => {});
    }

    poll.voters.push(user.id);
    option.votes++;
    await setData("polls_data", polls);
    
    const creator = await client.users.fetch(poll.creatorId).catch(() => ({ toString: () => "Unknown" }));
    const updatedText = createPollText(poll.question, poll.description, poll.options, poll.endTime, poll.voters.length, poll.id, creator);
    
    await reaction.message.edit(updatedText).catch(() => {});
    await reaction.users.remove(user.id).catch(() => {});
  });

  setInterval(async () => {
    const polls = getData("polls_data") || [];
    const now = Date.now();
    for (const poll of polls) {
      if (!poll.closed && poll.endTime <= now) {
        await closePoll(client, poll, polls);
      }
    }
  }, 30000);
}

function createPollText(q, d, opts, end, count, id, author) {
  return `## ${q}\n${d}\n\n` +
    opts.map(o => `${o.emoji} ${o.text}`).join("\n") + `\n\n` +
    `<:info:1467246059561685238> Endet am: <t:${Math.floor(end / 1000)}:R>\n` +
    `<:profil:1467246030998343733> Erstellt von: ${author}\n` +
    `<:statistiques:1467246038497886311> Teilnehmer: **${count}**\n` +
    `<:identifiant:1467246041668780227> ID: \`${id}\``;
}

async function closePoll(client, poll, polls) {
  poll.closed = true;
  await setData("polls_data", polls);

  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  const pollMsg = await channel?.messages.fetch(poll.messageId).catch(() => null);
  if (!pollMsg) return;

  await pollMsg.reactions.removeAll().catch(() => {});
  
  const total = poll.voters.length;
  const winnerVotes = Math.max(...poll.options.map(o => o.votes));
  
  let resultsText = `## <:statistiques:1467246038497886311> Ergebnisse: ${poll.question}\n\n`;
  
  if (total === 0) {
    resultsText += "Es hat niemand an der Umfrage teilgenommen.";
  } else {
    poll.options.forEach(o => {
      const percentage = Math.round((o.votes / total) * 100);
      const isWinner = o.votes === winnerVotes && winnerVotes > 0;
      const winnerMark = isWinner ? " <:checkmark:1467245996584210554>" : "";

      resultsText += `${o.emoji} **${o.text}**\n**${o.votes} Stimmen** (${percentage}%)${winnerMark}\n\n`;
    });
  }

  resultsText += `<:info:1467246059561685238> **Gesamtteilnehmer:** ${total}\n` +
                 `<:identifiant:1467246041668780227> **Poll-ID:** \`${poll.id}\``;

  await channel.send(resultsText);

  const updatedPolls = (getData("polls_data") || []).filter(p => p.id !== poll.id);
  await setData("polls_data", updatedPolls);
}
