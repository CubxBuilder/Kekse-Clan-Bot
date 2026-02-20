import cors from "cors";

export async function initProfileStatus(client, app) {
    app.use(cors()); // Erlaubt der Website den Zugriff

    const MY_ID = "1151971830983311441";
    let statusData = { status: "offline", activity: "" };

    // Funktion zum Extrahieren der Activity
    const getPresence = (presence) => {
        if (!presence || presence.userId !== MY_ID) return;
        
        // Wir suchen nach echten Aktivitäten (kein Custom Status Typ 4)
        const act = presence.activities.find(a => a.type !== 4);
        statusData = {
            status: presence.status,
            activity: act ? act.name : ""
        };
    };

    // Höre auf Statusänderungen
    client.on("presenceUpdate", (old, newPres) => getPresence(newPres));

    // API-Endpunkt für deine Website
    app.get("/api/status", (req, res) => {
        res.json(statusData);
    });
}
