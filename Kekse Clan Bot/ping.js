export function initPing(client) {
  const TEAM_ROLE_ID = "1457906448234319922";
  client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!ping") || msg.author.bot) return;
    if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) {
      const warn = await msg.channel.send("❌ Keine Berechtigung.");
      return setTimeout(() => warn.delete().catch(() => {}), 5000);
    }
    const start = Date.now();
    const sentMsg = await msg.channel.send("🏓 Pinging...").catch(() => null);
    if (!sentMsg) return;
    const end = Date.now();
    const roundtrip = end - start;
    const wsPing = client.ws.ping; 
    await sentMsg.edit({
      content: `🏓 **Pong!**\n- API-Latenz: \`${roundtrip}ms\`\n- WebSocket: \`${wsPing}ms\``
    }).catch(() => {});
    console.log(`[PING] ${msg.author.username} | RT: ${roundtrip}ms | WS: ${wsPing}ms`);
  });
}
