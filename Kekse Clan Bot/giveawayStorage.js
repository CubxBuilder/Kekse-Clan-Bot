
import { EmbedBuilder } from "discord.js";

const STORAGE_CHANNEL_ID = "1474140482551414899";

let storageMessage = null;
let data = {};

export async function initGiveawayStorage(client) {
  const channel = await client.channels.fetch(STORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessage = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );
client.on("messageCreate", async msg => {
  if (msg.content === "asdf3") {
    const activeGiveaways = getData("activeGiveaways") || {};
    activeGiveaways["1474089565424718099"] = {
      "channelId": "1423637646634123294",
      "startTime": 1771520739618,
      "endTime": 1771607139618,
      "price": "3x2 Karte",
      "messageText": "Viel Glück 🍀",
      "winnerCount": 1,
      "hostId": "1151971830983311441",
      "participants": [
        "1312771299059433523", "1463519496970174563", "1357063061386559640", "987357529107476510",
        "371649310137384960", "1192423110490738709", "1391885940376469665", "1218661866688221344",
        "1456362019706900593", "1239911232773947414", "1177314433698115636", "1107410616123134063",
        "1106234376427143238", "1240304690051285047", "1429845194106343497", "1153633749645402152",
        "1104326682606837872", "1180975110165893152", "1419762963526713487", "1099384774222680124",
        "1117500437386494043", "1358497960094335088", "955936212760268800", "1275425602349830238",
        "1416787374700236941", "1106885134864613407", "1143151029706293409", "1148145781459669033",
        "1341476313806012476", "1172824752528838768", "1192159371560485005", "1470079738553831522",
        "1234881126510628977", "1230208321995149325", "1406541925590372432", "1263039491959029783",
        "1151971830983311441"
      ]
    };
    await setData("activeGiveaways", activeGiveaways);
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
