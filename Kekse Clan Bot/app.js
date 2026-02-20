import { Client, GatewayIntentBits, Partials } from "discord.js"
import "dotenv/config"
import path from "path"
import express from "express"
import cors from "cors" // NEU: CORS für die API
import { fileURLToPath } from "url"
import { initCounting } from "./counting.js"
import { initModeration } from "./moderation.js"
import { registerMessageCommands } from "./messages.js"
import { initTickets } from "./tickets.js"
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
import { initAuditLogs } from "./auditLog.js"
import fs from "fs"

// --- LOGGING SETUP ---
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

console.log = (...args) => { originalLog(...args); writeToFile("INFO", args); };
console.error = (...args) => { originalError(...args); writeToFile("ERROR", args); };

// --- EXPRESS SETUP ---
const app = express()
app.use(cors()) // WICHTIG: Erlaubt deiner Website den Zugriff auf die API
app.use("/Kekse-Clan-Bot", express.static(path.join(__dirname, "public")))

// Variable für deinen Status
let myStatusData = { status: "offline", activity: "" };
const MY_ID = "1151971830983311441";

// API Endpunkt für dein Profil
app.get('/api/status', (req, res) => {
  res.json(myStatusData);
});

app.get('/', (req, res) => {
  res.send('Bot API is running!');
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`)
})

// --- DISCORD CLIENT SETUP ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences // Wichtig für Status & Activity!
  ],
  partials: [
    Partials.Channel, Partials.Message, Partials.Reaction, 
    Partials.GuildMember, Partials.User, Partials.ThreadMember
  ]
});

client.setMaxListeners(20);

// Storage Imports
import { initCountingStorage } from "./countingStorage.js"
import { initGiveawayStorage } from "./giveawayStorage.js"
import { initInvitesStorage } from "./invitesStorage.js"
import { initPollsStorage } from "./pollsStorage.js"
import { initTicketsStorage } from "./ticketsStorage.js"
import { initRemindersStorage } from "./remindersStorage.js"
import { initModerationStorage } from "./moderationStorage.js"

// --- PRESENCE LOGIK ---
function updateMyPresence(presence) {
    if (!presence || presence.userId !== MY_ID) return;

    myStatusData = {
        status: presence.status,
        activities: presence.activities.map(act => ({
            name: act.name,
            type: act.type, // 0: Game, 2: Listening, etc.
            details: act.details || "",
            state: act.state || "",
            // Generiert die URL für das Icon (Spiel-Cover oder Spotify-Album)
            image: act.assets ? act.assets.largeImageURL({ size: 128 }) : null,
            start: act.timestamps?.start ? act.timestamps.start.getTime() : null,
            end: act.timestamps?.end ? act.timestamps.end.getTime() : null
        }))
    };
}


client.on("presenceUpdate", (old, newPres) => {
    updateMyPresence(newPres);
});

client.once("ready", async () => {
  // Init Storages
  await initCountingStorage(client); await initGiveawayStorage(client);
  await initInvitesStorage(client); await initPollsStorage(client);
  await initTicketsStorage(client); await initRemindersStorage(client);
  await initModerationStorage(client);

  // Init Modules
  await initCounting(client); initModeration(client); registerMessageCommands(client);
  initTickets(client); initGiveaway(client); initPing(client);
  await initIds(client); initReminder(client); initReactions(client);
  initHelp(client); initTicketCategory(client); initPoll(client);
  initVerification(client); initForumWatch(client); initVoiceChannels(client);
  initInvites(client); initAuditLogs(client);

  // Initialer Status Check
  const guild = client.guilds.cache.first();
  if (guild) {
      const member = await guild.members.fetch(MY_ID).catch(() => null);
      if (member) updateMyPresence(member.presence);
  }

  client.user.setPresence({
    activities: [{ name: "!help", type: 0 }],
    status: "online"
  });
  console.log(`Bot online: ${client.user.tag}`);
});

client.on("error", console.error)
client.on("warn", console.warn)
client.login(process.env.BOT_TOKEN)
