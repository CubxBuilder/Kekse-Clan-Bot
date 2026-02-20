export async function initProfileStatus(client, app) {
  const MY_ID = "1151971830983311441";
  let currentStatus = "offline";
  const guild = client.guilds.cache.first();
  if (guild) {
    const member = await guild.members.fetch(MY_ID).catch(() => null);
    currentStatus = member?.presence?.status || "offline";
  }
  client.on("presenceUpdate", (old, newPresence) => {
    if (newPresence?.userId === MY_ID) {
      currentStatus = newPresence.status;
    }
  });
  app.get("/api/status", (req, res) => {
    res.json({ status: currentStatus });
  });
  console.log("Profile-Status-API aktiv.");
}
