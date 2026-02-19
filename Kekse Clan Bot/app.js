import { Client, GatewayIntentBits, Partials } from "discord.js"
import "dotenv/config"
import path from "path"
import express from "express"
import { fileURLToPath } from "url"
import { initCounting } from "./counting.js"
import { initModeration } from "./moderation.js"
import { registerMessageCommands } from "./messages.js"
import { initTickets } from "./dtickets.js"
import { initGiveaway } from "./giveaway.js"
import { initPing } from "./ping.js"
import { initIds } from "./ids.js"
import { initReminder } from "./reminder.js"
import { initReactions } from "./reactions.js"
import { initHelp } from "./help.js"
import { initTicketCategory } from "./ticket_category.js"
import { initPoll } from "./poll.js"
import { initVerification } from "./verification.js"
import { initForumWatch } from "./nameevent.js"
import { initVoiceChannels } from "./voicechannels.js"
import { initInvites } from "./invites.js"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOG_DIR = path.join(__dirname, "log-files");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function getLogFile() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return path.join(LOG_DIR, `logs-${day}-${month}-${year}.txt`);
}

const originalLog = console.log;
const originalError = console.error;

function writeToFile(prefix, args) {
  const timestamp = new Date().toLocaleString();
  const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : arg).join(" ");
  const logEntry = `[${timestamp}] [${prefix}] ${message}\n`;
  fs.appendFile(getLogFile(), logEntry, () => {})
}

console.log = (...args) => {
  originalLog(...args);
  writeToFile("INFO", args);
};

console.error = (...args) => {
  originalError(...args);
  writeToFile("ERROR", args);
};

const app = express()
app.use("/Kekse-Clan-Bot", express.static(path.join(__dirname, "public")))
const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`)
})
app.get('/', (req, res) => {
  res.send('Hello World!')
})

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
})
client.setMaxListeners(20);
import { initStorage } from "./storage.js"
import { initGiveawayStorage } from "./giveawayStorage.js"

client.once("ready", async () => {
  await initStorage(client)
  await initGiveawayStorage(client)
  await initCounting(client)
  initModeration(client)
  registerMessageCommands(client)
  initTickets(client)
  initGiveaway(client)
  initPing(client)
  await initIds(client)
  initReminder(client)
  initReactions(client)
  initHelp(client)
  initTicketCategory(client)
  initPoll(client)
  initVerification(client)
  initForumWatch(client)
  initVoiceChannels(client)
  initInvites(client)
  
  client.user.setPresence({
    activities: [{ name: "!help", type: 0 }],
    status: "online"
  });
  console.log(`Bot online: ${client.user.tag}`);
});
client.on("error", console.error)
client.on("warn", console.warn)
console.log("TOKEN:", process.env.BOT_TOKEN ? "OK" : "MISSING")
client.login(process.env.BOT_TOKEN)
