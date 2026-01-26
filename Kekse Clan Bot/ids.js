import fs from "fs";
import path from "path";

const IDS_FILE = path.join("Kekse Clan Bot/ids.json");

export async function initIds(client) {
  if (!client.isReady()) {
    await new Promise(resolve => client.once("ready", resolve));
  }

  const data = {
    servers: [],
    users: []
  };

  for (const [guildId, guild] of client.guilds.cache) {
    guild.channels.cache.forEach(channel => {
      let type;
      switch (channel.type) {
        case 0: type = "text"; break;
        case 2: type = "voice"; break;
        case 5: type = "announcement"; break;
        default: type = "other"; break;
      }
      data.servers.push({
        guildId: guild.id,
        guildName: guild.name,
        channelType: type,
        channelId: channel.id,
        channelName: channel.name
      });
    });

    try {
      await guild.members.fetch();
    } catch (err) {
      console.error(`Fehler beim Laden der Mitglieder von ${guild.name}:`, err);
    }

    guild.members.cache.forEach(member => {
      data.users.push({
        guildId: guild.id,
        userId: member.id,
        username: member.user.username
      });
    });
  }

  try {
    fs.writeFileSync(IDS_FILE, JSON.stringify(data, null, 2), "utf8");
    console.log("✅ ids.json wurde erstellt/aktualisiert");
  } catch (err) {
    console.error("❌ Fehler beim Schreiben von ids.json:", err);
  }
}
