import { EmbedBuilder } from "discord.js";
import { getData, setData } from "./pollsStorage.js";
const TEAM_ROLE_ID = "1457906448234319922";
const LOG_CHANNEL_ID = "1423413348220796991";
export function initPoll(client) {
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
      .setFooter({ text: 'Kekse Clan | Poll System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.content.startsWith("!")) return; 
    const args = msg.content.slice(1).match(/(?:[^\s,"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "").trim()) || [];
    const cmd = args.shift()?.toLowerCase();
    if (cmd === "poll") {
      if (!msg.member.roles.cache.has(TEAM_ROLE_ID))
        return msg.channel.send("❌ Du hast keine Berechtigung.");    
      if (args.length < 4) return msg.reply("❌ Nutzung: `!poll \"Frage\" \"Minuten\" ...`.");
      const [question, timeStr, description, ...options] = args;
      const time = parseInt(timeStr);
      if (isNaN(time) || options.length < 2 || options.length > 10) return msg.reply("❌ Fehlerhafte Parameter.");
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
        id: pollId, messageId: pollMsg.id, channelId: msg.channel.id,
        question, description, options: pollOptions, endTime,
        creatorId: msg.author.id, voters: [], closed: false
      });
      await setData("polls_data", polls);
      await sendKekseLog("Umfrage gestartet", msg.author, `**Frage:** ${question}\n**Dauer:** ${time} Min.\n**ID:** \`${pollId}\``);
    }
    if (cmd === "closepoll") {
      if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) return;
      const pollId = args[0];
      const polls = getData("polls_data") || [];
      const poll = polls.find(p => p.id === pollId && !p.closed);
      
      if (!poll) return msg.reply("❌ Poll nicht gefunden.");
      await closePoll(client, poll, polls, msg.author);
    }
    if (cmd === "listpolls") {
      const polls = getData("polls_data") || [];
      const activePolls = polls.filter(p => !p.closed);
      if (activePolls.length === 0) return msg.reply("Keine aktiven Polls.");
      const list = activePolls.map(p => `ID: \`${p.id}\` | ${p.question}`).join("\n");
      msg.reply(`**Aktive Polls:**\n${list}`);
    }
  });
  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    let polls = getData("polls_data") || [];
    const poll = polls.find(p => p.messageId === reaction.message.id && !p.closed);
    if (!poll) return;
    const option = poll.options.find(o => o.emoji === reaction.emoji.name);
    if (!option || poll.voters.includes(user.id)) return reaction.users.remove(user.id).catch(() => {});
    poll.voters.push(user.id);
    option.votes++;
    await setData("polls_data", polls);
    const creator = await client.users.fetch(poll.creatorId).catch(() => ({ toString: () => "Unknown" }));
    await reaction.message.edit(createPollText(poll.question, poll.description, poll.options, poll.endTime, poll.voters.length, poll.id, creator)).catch(() => {});
    await reaction.users.remove(user.id).catch(() => {});
  });
  setInterval(async () => {
    const polls = getData("polls_data") || [];
    const now = Date.now();
    for (const poll of polls) {
      if (!poll.closed && poll.endTime <= now) {
        const creator = await client.users.fetch(poll.creatorId).catch(() => client.user);
        await closePoll(client, poll, polls, creator);
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
async function closePoll(client, poll, polls, closer) {
  poll.closed = true;
  await setData("polls_data", polls);
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  const pollMsg = await channel?.messages.fetch(poll.messageId).catch(() => null);
  if (!pollMsg) return;
  await pollMsg.reactions.removeAll().catch(() => {});
  const total = poll.voters.length;
  let resultsText = `## <:statistiques:1467246038497886311> Ergebnisse: ${poll.question}\n\n`;
  if (total === 0) resultsText += "Keine Teilnehmer.";
  else {
    const winnerVotes = Math.max(...poll.options.map(o => o.votes));
    poll.options.forEach(o => {
      const perc = Math.round((o.votes / total) * 100);
      resultsText += `${o.emoji} **${o.text}**\n**${o.votes} Stimmen** (${perc}%)${o.votes === winnerVotes && total > 0 ? " <:checkmark:1467245996584210554>" : ""}\n\n`;
    });
  }
  await channel.send(resultsText);
  const logChannel = client.channels.cache.get("1423413348220796991");
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor('#ffffff')
      .setAuthor({ name: closer.username, iconURL: closer.displayAvatarURL() })
      .setDescription(`**Aktion:** \`Umfrage beendet\`\n**Frage:** ${poll.question}\n**Teilnehmer:** ${total}\n**ID:** \`${poll.id}\``)
      .setFooter({ text: 'Kekse Clan | Poll System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] });
  }
  const updatedPolls = (getData("polls_data") || []).filter(p => p.id !== poll.id);
  await setData("polls_data", updatedPolls);
}
