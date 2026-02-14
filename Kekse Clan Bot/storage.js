import { EmbedBuilder } from "discord.js";

const STORAGE_CHANNEL_ID = "1423413348220796996";

let storageMessage = null;
let data = {};

export async function initStorage(client) {
  const channel = await client.channels.fetch(STORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessage = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );

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
