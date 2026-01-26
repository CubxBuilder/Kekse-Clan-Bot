export function initPing(client) {
  const TEAM_ROLE_ID = "1457906448234319922";

  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!ping")) return;

    const member = msg.member;
    if (!member.roles.cache.has(TEAM_ROLE_ID)) {
      return msg.channel.send("❌ Du hast keine Berechtigung, diesen Befehl zu benutzen.");
    }

    const start = Date.now();
    const sentMsg = await msg.channel.send("🏓 Berechne Ping...");
    const end = Date.now();

    const ping = end - start;
    console.log(`[PING] Von ${msg.author.username}: ${ping}ms`);
    await sentMsg.edit(`🏓 Aktueller Ping: ${ping}ms`);
  });
}
