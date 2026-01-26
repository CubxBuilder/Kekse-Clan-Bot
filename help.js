export function initHelp(client) {
  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith("!")) return;

    const args = msg.content.slice(1).trim().split(" ");
    const cmd = args.shift().toLowerCase();

    if (cmd !== "help") return;

    console.log(`[HELP] Von ${msg.author.username}`);
    await msg.channel.send(
      "Erstelle ein <#1423413348493430905>. Ein Moderator wird sich so schnell wie möglich um dein Anliegen kümmern."
    );
  });
}