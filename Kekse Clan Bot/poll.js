import { EmbedBuilder } from "discord.js";
import { getData, setData } from "./storage.js";
const TEAM_ROLE_ID = "1457906448234319922";
export function initPoll(client) {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID))
      return msg.channel.send("❌ Du hast keine Berechtigung, eine Umfrage zu starten.");
    const args = msg.content.slice(1).match(/(?:[^\s,"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "").trim()) || [];
    const cmd = args.shift()?.toLowerCase();

    if (cmd === "poll") {
      if (args.length < 4) return msg.reply("❌ Nutzung: `!poll \"Frage\" \"Zeit (Minuten)\" \"Beschreibung\" \"Antwort 1\" \"Antwort 2\" ...` (min. 2 Antworten)");

      const [question, timeStr, description, ...options] = args;
      const time = parseInt(timeStr);

      if (isNaN(time) || options.length < 2 || options.length > 10) {
        return msg.reply("❌ Ungültige Parameter. Min. 2 Antworten, Max. 10.");
      }

      const data = await getData() || {};
      data.polls = data.polls || [];
      const pollId = data.polls.length + 1;

      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const pollOptions = options.map((opt, i) => ({ text: opt, emoji: emojis[i], votes: 0 }));

      let optionsText = pollOptions.map(o => `${o.emoji} ${o.text}`).join("\n");
      const endTime = Date.now() + time * 60000;

      const pollContent = `## ${question}\n${description}\n\n${optionsText}\n\n` +
        `<:info:1467246059561685238> Endet am: <t:${Math.floor(endTime / 1000)}:R>\n` +
        `<:profil:1467246030998343733> Erstellt von: ${msg.author}\n` +
        `<:statistiques:1467246038497886311> Teilnehmer: 0\n` +
        `<:identifiant:1467246041668780227> ID: ${pollId}`;

      const pollMsg = await msg.channel.send(pollContent);
      for (let i = 0; i < pollOptions.length; i++) {
        await pollMsg.react(pollOptions[i].emoji);
      }

      const pollData = {
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
      };

      data.polls.push(pollData);
      await setData("polls_data", data.polls);
    }

    if (cmd === "closepoll") {
      const pollId = parseInt(args[0]);
      if (isNaN(pollId)) return msg.reply("❌ Bitte gib eine gültige Poll-ID an.");

      const polls = await getData("polls_data") || [];
      const poll = polls.find(p => p.id === pollId);
      if (!poll || poll.closed) return msg.reply("❌ Poll nicht gefunden oder bereits geschlossen.");

      await closePoll(client, poll, polls);
      msg.reply(`✅ Poll #${pollId} wurde geschlossen.`);
    }

    if (cmd === "listpolls") {
      const polls = await getData("polls_data") || [];
      const activePolls = polls.filter(p => !p.closed) || [];
      if (activePolls.length === 0) return msg.reply("Keine aktiven Polls.");

      const list = activePolls.map(p => `ID: ${p.id} | ${p.question}`).join("\n");
      msg.reply(`<:statistiques:1467246038497886311> **Aktive Polls:**\n${list}`);
    }
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    const polls = await getData("polls_data") || [];
    const poll = polls.find(p => p.messageId === reaction.message.id && !p.closed);
    if (!poll) return;

    const option = poll.options.find(o => o.emoji === reaction.emoji.name);
    if (!option) {
      try {
        await reaction.users.remove(user.id);
      } catch (e) {}
      return;
    }

    const voterIndex = poll.voters.findIndex(v => v.userId === user.id);
    if (voterIndex !== -1) {
      try {
        await reaction.users.remove(user.id);
      } catch (e) {}
      return; 
    }

    poll.voters.push({ userId: user.id, choices: [option.emoji] });
    option.votes++;
    
    try {
      await reaction.users.remove(user.id);
    } catch (e) {}

    const totalVoters = poll.voters.length;
    const endTime = poll.endTime;

    const pollContent = `## ${poll.question}\n${poll.description}\n\n` +
      poll.options.map(o => `${o.emoji} ${o.text}`).join("\n") + `\n\n` +
      `<:info:1467246059561685238> Endet am: <t:${Math.floor(endTime / 1000)}:R>\n` +
      `<:profil:1467246030998343733> Erstellt von: <@${poll.creatorId}>\n` +
      `<:statistiques:1467246038497886311> Teilnehmer: ${totalVoters}\n` +
      `<:identifiant:1467246041668780227> ID: ${poll.id}`;

    await reaction.message.edit(pollContent);
    await setData("polls_data", polls);
  });

  setInterval(async () => {
    const polls = await getData("polls_data") || [];
    const now = Date.now();
    const expired = polls.filter(p => !p.closed && p.endTime <= now);
    if (expired && expired.length > 0) {
      for (const poll of expired) {
        await closePoll(client, poll, polls);
      }
    }
  }, 30000);
}

async function closePoll(client, poll, polls) {
  poll.closed = true;
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  if (!channel) {
    await setData("polls_data", polls);
    return;
  }

  const pollMsg = await channel.messages.fetch(poll.messageId).catch(() => null);
  if (!pollMsg) {
    await setData("polls_data", polls);
    return;
  }

  const totalVoters = poll.voters.length;
  let optionsText = poll.options.map(o => `${o.emoji} ${o.text}`).join("\n");

  const pollContent = `## ${poll.question}\n${poll.description}\n\n${optionsText}\n\n` +
    `<:info:1467246059561685238> Geendet am: <t:${Math.floor(poll.endTime / 1000)}:f>\n` +
    `<:profil:1467246030998343733> Erstellt von: <@${poll.creatorId}>\n` +
    `<:statistiques:1467246038497886311> Teilnehmer: ${totalVoters}\n` +
    `<:identifiant:1467246041668780227> ID: ${poll.id}`;

  await pollMsg.edit(pollContent);
  await pollMsg.reactions.removeAll().catch(() => {});

  let resultsText = `**Ergebnisse für: ${poll.question}** (ID: ${poll.id})\n\n`;
  if (totalVoters === 0) {
    resultsText += "Es hat niemand an der Umfrage teilgenommen.";
  } else {
    const highestPercentage = totalVoters > 0
  ? Math.max(...poll.options.map(o => Math.round((o.votes / totalVoters) * 100)))
  : 0;

poll.options.forEach(o => {
  const percentage = totalVoters > 0
    ? Math.round((o.votes / totalVoters) * 100)
    : 0;

  const winnerMark = percentage === highestPercentage && highestPercentage > 0 ? " 🏆" : "";

  resultsText += `${o.emoji} **${o.text}**: ${o.votes} Stimmen (${percentage}%)${winnerMark}\n`;
});

resultsText += `\nGesamtteilnehmer: ${totalVoters}`;
  }

  await channel.send(resultsText);
  const updatedPolls = polls.filter(p => p.id !== poll.id);
  await setData("polls_data", updatedPolls);
}
