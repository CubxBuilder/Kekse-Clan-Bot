import { AttachmentBuilder } from "discord.js";

const STORAGE_CHANNEL_ID = "1423413348220796996";
let storageMessage = null;
let data = {};

export async function initStorage(client) {
  const channel = await client.channels.fetch(STORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.error("❌ Storage-Kanal nicht gefunden!");
    return;
  }

  const messages = await channel.messages.fetch({ limit: 10 });
  storageMessage = messages.find(m => m.author.id === client.user.id && m.attachments.size > 0);

  if (!storageMessage) {
    const buffer = Buffer.from(JSON.stringify({ _init: true }, null, 2));
    storageMessage = await channel.send({ files: [new AttachmentBuilder(buffer, { name: "storage.json" })] });
    data = { _init: true };
  } else {
    try {
      const attachment = storageMessage.attachments.first();
      const fileData = await fetch(attachment.url).then(res => res.text());
      data = JSON.parse(fileData);
    } catch (e) {
      console.error("❌ Fehler beim Laden der Storage-Datei, erstelle neu.");
      const buffer = Buffer.from(JSON.stringify({ _init: true }, null, 2));
      storageMessage = await channel.send({ files: [new AttachmentBuilder(buffer, { name: "storage.json" })] });
      data = { _init: true };
    }
  }

  console.log("✅ Storage geladen.");
}

export function getData(key) {
  return data[key];
}

export async function setData(key, value) {
  data[key] = value;
  if (!storageMessage) return;

  try {
    const buffer = Buffer.from(JSON.stringify(data, null, 2));
    await storageMessage.edit({ files: [new AttachmentBuilder(buffer, { name: "storage.json" })] });
  } catch (err) {
    console.error("❌ Fehler beim Speichern der Storage-Datei:", err);
  }
}
