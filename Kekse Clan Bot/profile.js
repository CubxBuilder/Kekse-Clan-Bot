import cors from "cors";

export async function initProfileStatus(client, app) {
  app.use(cors());

  const MY_ID = "1151971830983311441";
  let currentStatus = "offline";
  let currentActivity = "";

  const updateData = (presence) => {
    if (presence?.userId === MY_ID) {
      currentStatus = presence.status;
      currentActivity = presence.activities[0]?.name || "";
    }
  };

  client.on("presenceUpdate", (old, newPresence) => updateData(newPresence));

  app.get("/api/status", (req, res) => {
    res.json({ 
      status: currentStatus,
      activity: currentActivity 
    });
  });
}
