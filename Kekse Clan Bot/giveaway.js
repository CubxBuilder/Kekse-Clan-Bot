import { EmbedBuilder } from "discord.js";

const GIVEAWAY_EMOJI = "🎉";
const TEAM_ROLE_ID = "1457906448234319922";
const EMBED_COLOR = 0xffffff;

export function initGiveaway(client) {

  const activeGiveaways = new Map();

  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!giveaway")) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID))
      return msg.channel.send("❌ Du hast keine Berechtigung, ein Giveaway zu starten.");

    const args = msg.content.split(" ").slice(1);
    if (args.length < 3)
      return msg.channel.send("❌ Bitte Kanal, Dauer und Preis angeben.");

    let [channelMention, durationRaw, price, ...rest] = args;

    const giveawayChannel = channelMention.startsWith("<#")
      ? msg.guild.channels.cache.get(channelMention.slice(2, -1))
      : msg.guild.channels.cache.get(channelMention);

    if (!giveawayChannel) return msg.channel.send("❌ Kanal nicht gefunden.");

    const match = durationRaw.match(/^(\d+)([smhd])$/);
    if (!match)
      return msg.channel.send("❌ Ungültige Dauer. Format: 10s, 5m, 2h, 1d");

    let [, amount, unit] = match;
    amount = parseInt(amount);

    let durationMs = 0;
    if (unit === "s") durationMs = amount * 1000;
    if (unit === "m") durationMs = amount * 60000;
    if (unit === "h") durationMs = amount * 3600000;
    if (unit === "d") durationMs = amount * 86400000;

    let messageText = rest[0] || "Viel Glück 🍀";
    let winnerCount = 1;
    let blacklist = [];
    let whitelistRoleId = null;

    rest.slice(1).forEach(arg => {
      if (arg.startsWith("winners=")) winnerCount = Math.max(1, parseInt(arg.split("=")[1]));
      if (arg.startsWith("blacklist=")) blacklist = arg.split("=")[1].split(",");
      if (arg.startsWith("whitelist=")) whitelistRoleId = arg.split("=")[1];
    });

    const endTime = Date.now() + durationMs;

    const embed = new EmbedBuilder()
      .setTitle(`🎁 Giveaway: ${price}`)
      .setDescription(
`${messageText}

Endet am: <t:${Math.floor(endTime / 1000)}:F>
Hosted by: ${msg.author}
Enteries: 0
Winners: ${winnerCount}`
      )
      .setColor(EMBED_COLOR);

    const giveawayMessage = await giveawayChannel.send({ embeds: [embed] });
    await giveawayMessage.react(GIVEAWAY_EMOJI);

    activeGiveaways.set(giveawayMessage.id, {
      endTime,
      winnerCount,
      blacklist,
      whitelistRoleId,
      participants: new Set()
    });

    const interval = setInterval(async () => {
      const data = activeGiveaways.get(giveawayMessage.id);
      if (!data) return clearInterval(interval);

      if (Date.now() >= data.endTime) {
        clearInterval(interval);

        const participants = Array.from(data.participants);
        const winners = shuffle(participants).slice(0, data.winnerCount);
        const winnerNames = winners.length
          ? winners.map(id => `<@${id}>`).join(", ")
          : "—";

        const finishedEmbed = EmbedBuilder.from(embed)
          .setDescription(
`${messageText}

Endet: <t:${Math.floor(endTime / 1000)}:F>
Hosted by: ${msg.author}
Enteries: ${participants.length}
Winners: ${winnerNames}`
          );

        await giveawayMessage.edit({ embeds: [finishedEmbed] });

        if (winners.length === 0) {
          giveawayChannel.send("❌ Es gibt keine Gewinner.");
        } else if (winners.length === 1) {
          giveawayChannel.send(`🎉 Herzlichen Glückwunsch <@${winners[0]}>, bitte erstelle ein Ticket, um deinen Gewinn zu erhalten.`);
        } else {
          giveawayChannel.send(`🎉 Herzlichen Glückwunsch ${winnerNames}, bitte erstellt Tickets, um eure Gewinne zu erhalten.`);
        }

        activeGiveaways.delete(giveawayMessage.id);
        return;
      }

      const updatedEmbed = EmbedBuilder.from(embed)
        .setDescription(
`${messageText}

Endet am: <t:${Math.floor(endTime / 1000)}:F>
Hosted by: ${msg.author}
Enteries: ${data.participants.size}
Winners: ${winnerCount}`
        );

      await giveawayMessage.edit({ embeds: [updatedEmbed] });

    }, 1000);
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (reaction.emoji.name !== GIVEAWAY_EMOJI) return;

    const giveaway = activeGiveaways.get(reaction.message.id);
    if (!giveaway) return;

    reaction.users.remove(user.id).catch(() => {});
    const member = await reaction.message.guild.members.fetch(user.id);

    if (giveaway.blacklist.includes(user.id)) return;
    if (giveaway.whitelistRoleId && !member.roles.cache.has(giveaway.whitelistRoleId)) return;

    giveaway.participants.add(user.id);
  });

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
