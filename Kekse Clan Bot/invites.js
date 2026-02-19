import { EmbedBuilder } from "discord.js";
import { getData, setData } from "./invitesStorage.js";
export async function initInvites(client) {
  const inviteCache = new Map();
  const TEAM_ROLE_ID = "1457906448234319922";
  const cacheInvites = async () => {
    for (const g of client.guilds.cache.values()) {
      const invs = await g.invites.fetch().catch(() => null);
      if (invs) inviteCache.set(g.id, new Map(invs.map(i => [i.code, i.uses])));
    }
  };
  client.on("ready", cacheInvites);
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    const args = msg.content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();
    if (cmd === "invite_leaderboard" || cmd === "invites") {
      const stats = getData("invite_stats") || {};
      const leaderboard = Object.entries(stats).map(([id, s]) => ({ id, ...s, total: (s.regular || 0) - (s.left || 0) - (s.fake || 0) + (s.bonus || 0) })).sort((a, b) => b.total - a.total).slice(0, 10);
      if (leaderboard.length === 0) return msg.reply("Keine Daten.");
      let desc = "";
      leaderboard.forEach((e, i) => { desc += `\`${i + 1}. \` <@${e.id}> • **${e.total}** invites. (${e.regular} regular, ${e.left} left, ${e.fake} fake, ${e.bonus} bonus)\n`; });
      const embed = new EmbedBuilder().setTitle("<:statistiques:1467246038497886311> Invite Leaderboard").setDescription(desc).setColor(0xffffff);
      await msg.reply({ embeds: [embed] });
    }
    if (cmd === "addbonus" && msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      const target = msg.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return msg.reply("❌ !addbonus @user 10");
      const stats = getData("invite_stats") || {};
      stats[target.id] = stats[target.id] || { regular: 0, left: 0, fake: 0, bonus: 0 };
      stats[target.id].bonus = (stats[target.id].bonus || 0) + amount;
      await setData("invite_stats", stats);
      msg.reply(`✅ +${amount} für ${target.username}`);
    }
  });
  client.on("guildMemberAdd", async (m) => {
    const cached = inviteCache.get(m.guild.id);
    const current = await m.guild.invites.fetch().catch(() => null);
    if (!current || !cached) return;
    const used = current.find(i => i.uses > (cached.get(i.code) || 0));
    inviteCache.set(m.guild.id, new Map(current.map(i => [i.code, i.uses])));
    if (used) {
      const stats = getData("invite_stats") || {};
      const rels = getData("invite_relations") || {};
      const inviterId = used.inviter.id;
      stats[inviterId] = stats[inviterId] || { regular: 0, left: 0, fake: 0, bonus: 0 };
      rels[m.id] = inviterId;
      const isFake = (Date.now() - m.user.createdTimestamp) < 86400000;
      isFake ? stats[inviterId].fake++ : stats[inviterId].regular++;
      await setData("invite_stats", stats);
      await setData("invite_relations", rels);
    }
  });
  client.on("guildMemberRemove", async (m) => {
    const rels = getData("invite_relations") || {};
    const inviterId = rels[m.id];
    if (inviterId) {
      const stats = getData("invite_stats") || {};
      if (stats[inviterId]) { stats[inviterId].left++; await setData("invite_stats", stats); }
      delete rels[m.id];
      await setData("invite_relations", rels);
    }
  });
}
