// --------------------- NAVIGATION ---------------------
const linkDashboard = document.getElementById("Link-Dashboard");
const linkTicketArchive = document.getElementById("Link-Ticket-Archive");
const body = document.body;

// Add active class handling for sidebar
linkDashboard.addEventListener("click", () => {
  body.classList.remove("show-archive");
  body.classList.add("show-dashboard");
  document.getElementById('dashboard').style.display = 'grid';
  document.getElementById('ticket-archive').style.display = 'none';
  linkDashboard.classList.add('active');
  linkTicketArchive.classList.remove('active');
});

linkTicketArchive.addEventListener("click", () => {
  body.classList.remove("show-dashboard");
  body.classList.add("show-archive");
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('ticket-archive').style.display = 'block';
  linkTicketArchive.classList.add('active');
  linkDashboard.classList.remove('active');
});

// Set default active
linkDashboard.classList.add('active');
document.getElementById('dashboard').style.display = 'grid';

// --------------------- COMMAND INPUTS ---------------------
const commandSelect = document.getElementById("command-select");
const channelSelect = document.getElementById("channel");
const userSelect = document.getElementById("user");
const titelInput = document.getElementById("titel");
const textInput = document.getElementById("text");
const numberInput = document.getElementById("number");
const durationInput = document.getElementById("duration");

// Zusätzliche Inputs
const colorInput = document.getElementById("color"); // für !embed
const reasonInput = document.getElementById("reason"); // für kick/ban/warn/timeout
const cathegorieSelect = document.getElementById("cathegorie"); // für !ticket
const priceInput = document.getElementById("price"); // für !giveaway
const whitelistSelect = document.getElementById("whitelist"); // für !giveaway
const blacklistSelect = document.getElementById("blacklist"); // für !giveaway

const sendButton = document.getElementById("send");
const infoDiv = document.getElementById("info");

// --------------------- Channels, Users, Roles, Categories ---------------------
const channels = ["#allgemein", "#support", "#spam"];
const users = ["@Max", "@Anna", "@Tom"];
const categories = ["Support", "Feedback", "Sonstiges"];
const roles = ["Admin", "Moderator", "Mitglied"];

channels.forEach(ch => {
  const opt = document.createElement("option");
  opt.value = ch;
  opt.textContent = ch;
  channelSelect.appendChild(opt);
});

users.forEach(u => {
  const opt = document.createElement("option");
  opt.value = u;
  opt.textContent = u;
  userSelect.appendChild(opt);
});

categories.forEach(c => {
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  cathegorieSelect.appendChild(opt);
});

roles.forEach(r => {
  const opt = document.createElement("option");
  opt.value = r;
  opt.textContent = r;
  whitelistSelect.appendChild(opt);
});

// --------------------- INPUT LOGIC ---------------------
function updateInputs() {
  const cmd = commandSelect.value;

  // Alle Inputs verstecken
  const allInputs = [
    titelInput, textInput, numberInput, durationInput,
    channelSelect, userSelect, colorInput, reasonInput,
    cathegorieSelect, priceInput, whitelistSelect, blacklistSelect
  ];
  allInputs.forEach(el => {
    if(el) el.style.display = "none";
  });

  // Sichtbar machen, was der Command benötigt
  switch(cmd) {
    case "!send":
      channelSelect.style.display = "block";
      textInput.style.display = "block";
      break;
    case "!embed":
      channelSelect.style.display = "block";
      titelInput.style.display = "block";
      textInput.style.display = "block";
      if(colorInput) colorInput.style.display = "block";
      break;
    case "!dm":
      userSelect.style.display = "block";
      textInput.style.display = "block";
      break;
    case "!timeout":
      userSelect.style.display = "block";
      durationInput.style.display = "block";
      if(reasonInput) reasonInput.style.display = "block";
      break;
    case "!untimeout":
      userSelect.style.display = "block";
      break;
    case "!kick":
    case "!ban":
      userSelect.style.display = "block";
      if(reasonInput) reasonInput.style.display = "block";
      break;
    case "!unban":
      userSelect.style.display = "block";
      break;
    case "!warn":
      userSelect.style.display = "block";
      if(reasonInput) reasonInput.style.display = "block";
      break;
    case "!warns":
      userSelect.style.display = "block";
      break;
    case "!warn_remove":
      userSelect.style.display = "block";
      numberInput.style.display = "block";
      break;
    case "!ticket":
      if(cathegorieSelect) cathegorieSelect.style.display = "block";
      break;
    case "!ticket_panel":
      channelSelect.style.display = "block";
      break;
    case "!close":
      channelSelect.style.display = "block";
      break;
    case "!giveaway":
      channelSelect.style.display = "block";
      durationInput.style.display = "block";
      numberInput.style.display = "block";
      if(priceInput) priceInput.style.display = "block";
      if(whitelistSelect) whitelistSelect.style.display = "block";
      if(blacklistSelect) blacklistSelect.style.display = "block";
      break;
    case "!top":
    case "!ping":
      // keine Inputs sichtbar
      break;
  }
}

// Initiales Update
updateInputs();
commandSelect.addEventListener("change", updateInputs);

// --------------------- SEND BUTTON ---------------------
sendButton.addEventListener("click", () => {
  const cmd = commandSelect.value;
  if(!cmd) {
    infoDiv.textContent = "Bitte einen Command wählen!";
    return;
  }

  const payload = {
    command: cmd,
    channel: channelSelect?.value || "",
    user: userSelect?.value || "",
    titel: titelInput?.value || "",
    text: textInput?.value || "",
    number: numberInput?.value || "",
    duration: durationInput?.value || "",
    color: colorInput?.value || "",
    reason: reasonInput?.value || "",
    cathegorie: cathegorieSelect?.value || "",
    price: priceInput?.value || "",
    whitelist: whitelistSelect?.value || "",
    blacklist: blacklistSelect?.value || ""
  };

  // Ausgabe in Console Panel
  const consoleOutput = document.getElementById("console-output");
  const p = document.createElement("p");
  p.textContent = `[${new Date().toLocaleTimeString()}] Command: ${JSON.stringify(payload)}`;
  consoleOutput.appendChild(p);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;

  infoDiv.textContent = `Command ${cmd} ausgewählt!`;
});
