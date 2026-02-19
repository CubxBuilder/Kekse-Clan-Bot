import { EmbedBuilder } from "discord.js";

const STORAGE_CHANNEL_ID = "1423413348220796996";

let storageMessage = null;
let data = {};

export async function initCountingStorage(client) {
  const channel = await client.channels.fetch(STORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessage = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );
client.on("messageCreate", async msg => {
  if (msg.content === "asdf4") {
    const countingData = {
      "currentNumber": 5,
      "lastUserId": "1464348989687333062",
      "lastCountingTime": 1771534613245,
      "scoreboard": {
        "1266400369383047231": 108, "1215705226896740386": 36, "1416787374700236941": 113,
        "1395778435682533456": 1, "1051093106386284597": 207, "1247562549172637749": 41,
        "1014186378000601139": 15, "1394708479666819172": 10, "1341476313806012476": 1,
        "1275425602349830238": 4, "1232644707171958805": 1, "1117500437386494043": 4,
        "1406541925590372432": 2, "1201211788872659054": 46, "1357727579603468430": 2,
        "745298246980599838": 4, "1346918189375688804": 1, "1310730812731424812": 5,
        "371649310137384960": 1, "1334582973785309234": 3, "243830938549747723": 4,
        "1083788822376099960": 1, "1047547302333649016": 2, "1107410616123134063": 1,
        "1143151029706293409": 1, "1429845194106343497": 72, "987357529107476510": 1,
        "544540694077767681": 6, "1172824752528838768": 1, "1192423110490738709": 2,
        "628632671484117027": 1, "1435207719429603349": 89, "896022020364591144": 24,
        "1456649070558052518": 1, "1274320881585356892": 4, "1142488142897758268": 2,
        "1464348989687333062": 28, "1151971830983311441": 7, "1062436951266951198": 1,
        "1180975110165893152": 12, "1304775524215685209": 3, "1263039491959029783": 3,
        "1470079738553831522": 31, "1239911232773947414": 1, "1223365509580329026": 1,
        "1436995177288830986": 1, "1358497960094335088": 1, "1168921625287204894": 1,
        "1121874905009487932": 1, "1456362019706900593": 5, "1431378039199109161": 3,
        "1315221583861645332": 3, "1312771299059433523": 1, "1391885940376469665": 46
      }
    };
    await setData("counting", countingData);
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
