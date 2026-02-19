import { getData, setData } from "./storage.js";
export async function initInvites(client) {
  const inviteCache = new Map();
  const TEAM_ROLE_ID = "1457906448234319922";
  client.on("messageCreate", async (msg) => {
    if (msg.content === "!asdf" && msg.member?.roles.cache.has(TEAM_ROLE_ID)) {
      const manualStats = {
        "1457906448234319922": { regular: 92, left: 23, fake: 4, bonus: 0, name: "Keksor 🍪" },
        "123456789012345678": { regular: 31, left: 13, fake: 2, bonus: 0, name: "Fabian 🍪" },
        "1271382539101016146": { regular: 3, left: 0, fake: 0, bonus: 0, name: "User 3" },
      };
      await setData("invite_stats", manualStats);
      return msg.reply("✅ Leaderboard mit deinen neuen Beispieldaten aktualisiert!");
    }
  });
  const cacheAllInvites = async () => {
    for (const guild of client.guilds.cache.values()) {
      const invites = await guild.invites.fetch().catch(() => null);
      if (invites) inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
    }
  };
  client.on("ready", cacheAllInvites);
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    const args = msg.content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();
    if (cmd === "inviteleaderboard") {
      const stats = getData("invite_stats") || {};
      const leaderboard = Object.entries(stats)
        .map(([id, s]) => ({
          id,
          ...s,
          total: (s.regular || 0) - (s.left || 0) - (s.fake || 0) + (s.bonus || 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      if (leaderboard.length === 0) return msg.reply("Keine Daten vorhanden.");
      let output = "";
      for (let i = 0; i < leaderboard.length; i++) {
        const e = leaderboard[i];
        const user = client.users.cache.get(e.id) || await client.users.fetch(e.id).catch(() => null);
        const name = user ? `@${user.username}` : (e.name || `<@${e.id}>`);
        output += `'${i + 1}.  ${name} • ${e.total} invites. (${e.regular} regular, ${e.left} left, ${e.fake} fake, ${e.bonus} bonus)\n`;
      }
      await msg.channel.send(output);
    }
    if (cmd === "addbonus" && msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      const target = msg.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return msg.reply("❌ Nutzung: `!addbonus @user 10`.");

      const stats = getData("invite_stats") || {};
      stats[target.id] = stats[target.id] || { regular: 0, left: 0, fake: 0, bonus: 0 };
      stats[target.id].bonus = (stats[target.id].bonus || 0) + amount;
      await setData("invite_stats", stats);
      msg.reply(`✅ **${amount}** Bonus-Invites für **${target.username}** hinzugefügt.`);
    }
  });
  client.on("guildMemberAdd", async (member) => {
    const cached = inviteCache.get(member.guild.id);
    const current = await member.guild.invites.fetch().catch(() => null);
    if (!current || !cached) return;
    const usedInvite = current.find(i => i.uses > (cached.get(i.code) || 0));
    inviteCache.set(member.guild.id, new Map(current.map(i => [i.code, i.uses])));
    if (usedInvite) {
      const stats = getData("invite_stats") || {};
      const relations = getData("invite_relations") || {};
      const inviterId = usedInvite.inviter.id;

      stats[inviterId] = stats[inviterId] || { regular: 0, left: 0, fake: 0, bonus: 0 };
      relations[member.id] = inviterId;

      const isFake = (Date.now() - member.user.createdTimestamp) < 24 * 60 * 60 * 1000;
      isFake ? stats[inviterId].fake++ : stats[inviterId].regular++;

      await setData("invite_stats", stats);
      await setData("invite_relations", relations);
    }
  });
  client.on("guildMemberRemove", async (member) => {
    const relations = getData("invite_relations") || {};
    const inviterId = relations[member.id];
    if (inviterId) {
      const stats = getData("invite_stats") || {};
      if (stats[inviterId]) {
        stats[inviterId].left++;
        await setData("invite_stats", stats);
      }
      delete relations[member.id];
      await setData("invite_relations", relations);
    }
  });
}
