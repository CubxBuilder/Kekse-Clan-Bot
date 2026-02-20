import cors from "cors";

export async function initProfileStatus(client, app) {
  app.use(cors());
  
  const MY_ID = "1151971830983311441";
  let currentStatus = "offline";

  client.on("presenceUpdate", (old, newPresence) => {
    if (newPresence?.userId === MY_ID) {
      currentStatus = newPresence.status;
    }
  });

  app.get("/api/status", (req, res) => {
    res.json({ status: currentStatus });
  });
}
