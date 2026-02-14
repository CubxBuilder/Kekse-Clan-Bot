import fs from "fs";
import path from "path";

const FILE_PATH = path.resolve("./storage.json");
let data = { _init: true };

export async function initStorage() {
  try {
    const raw = await fs.promises.readFile(FILE_PATH, "utf-8");
    data = JSON.parse(raw);
    console.log("✅ Storage geladen.");
  } catch (err) {
    console.log("⚠️ Storage-Datei nicht gefunden oder fehlerhaft, erstelle neu.");
    data = { _init: true };
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
  }
}

export function getData(key) {
  return data[key];
}

export async function setData(key, value) {
  data[key] = value;
  try {
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Fehler beim Speichern:", err);
  }
}
