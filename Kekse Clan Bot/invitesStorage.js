import { EmbedBuilder } from "discord.js";

const STORAGE_CHANNEL_ID = "1474141512165097616";

let storageMessage = null;
let data = {};

export async function initInvitesStorage(client) {
  const channel = await client.channels.fetch(STORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessage = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );
client.on("messageCreate", async msg => {
  if (msg.content === "asdf2") {
    const allInvites = getData("invites") || {};
    allInvites["1266400369383047231"] = { "regular": 92, "left": 23, "fake": 4, "bonus": 0 };
    allInvites["1151971830983311441"] = { "regular": 31, "left": 13, "fake": 2, "bonus": 0 };
    allInvites["1271382539101016146"] = { "regular": 3, "left": 0, "fake": 0, "bonus": 0 };
    allInvites["1089227392029044746"] = { "regular": 1, "left": 0, "fake": 0, "bonus": 0 };
    allInvites["1143151029706293409"] = { "regular": 1, "left": 0, "fake": 0, "bonus": 0 };
    allInvites["1177314433698115636"] = { "regular": 1, "left": 0, "fake": 0, "bonus": 0 };
    allInvites["1416787374700236941"] = { "regular": 1, "left": 0, "fake": 0, "bonus": 0 };
    allInvites["173554407408009217"] = { "regular": 0, "left": 0, "fake": 0, "bonus": 0 };
    allInvites["270519783835828224"] = { "regular": 0, "left": 0, "fake": 0, "bonus": 0 };
    allInvites["371649310137384960"] = { "regular": 0, "left": 0, "fake": 0, "bonus": 0 };
    await setData("invites", allInvites);
  }
});

  if (!storageMessage) {
    data = { _init: true };
    const embed = new EmbedBuilder()
      .setTitle("Storage")
      .setDescription("```json\n" + JSON.stringify(data) + "\n```");

    storageMessage = await channel.send({ embeds: [embed] });
  } else {
    try {
      const raw = storageMessage.embeds[0].description
        .replace("```json\n", "")
        .replace("\n```", "");

      data = JSON.parse(raw);
    } catch {
      data = { _init: true };
    }
  }
}

export function getData(key) {
  return data[key];
}

export async function setData(key, value) {
  if (!storageMessage) return;

  data[key] = value;

  const jsonString = JSON.stringify(data);

  const embed = new EmbedBuilder()
    .setTitle("Storage")
    .setDescription("```json\n" + jsonString + "\n```");

  await storageMessage.edit({ embeds: [embed] }).catch(console.error);
  
}
