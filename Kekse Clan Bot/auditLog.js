import { EmbedBuilder, Events, AuditLogEvent } from "discord.js";

const LOG_ID = "1423413348220796991";

export function initAuditLogs(client) {
  const kLog = async (title, user, text, color = "#ffffff", thumb = null, channelId = null) => {
    if (channelId === LOG_ID) return;
    
    const chan = client.channels.cache.get(LOG_ID);
    if (!chan) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ 
        name: user?.tag || "System / Admin", 
        iconURL: user?.displayAvatarURL() || client.user.displayAvatarURL() 
      })
      .setDescription(`**Event:** \`${title}\`\n${text}`)
      .setFooter({ text: 'Kekse Clan Security' })
      .setTimestamp();
    
    if (thumb) embed.setThumbnail(thumb);
    await chan.send({ embeds: [embed] }).catch(() => {});
  };

  client.on(Events.MessageDelete, msg => {
    if (msg.partial || msg.author?.bot || msg.channel.id === LOG_ID) return;
    const pings = msg.mentions.users.size > 0 ? "⚠️ **GHOST PING ERKANNT**" : "";
    kLog("Nachricht gelöscht", msg.author, `${pings}\n**Kanal:** ${msg.channel}\n**Inhalt:**\n\`\`\`${msg.content || "Anhang/Embed"}\`\`\``, "#ff4b4b", null, msg.channel.id);
  });

  client.on(Events.MessageUpdate, (o, n) => {
    if (o.partial || o.content === n.content || o.author?.bot || o.channel.id === LOG_ID) return;
    kLog("Nachricht editiert", o.author, `**Kanal:** ${o.channel}\n**Vorher:**\n\`\`\`${o.content}\`\`\`\n**Nachher:**\n\`\`\`${n.content}\`\`\``, "#ffca00", null, o.channel.id);
  });

  client.on(Events.GuildMemberAdd, m => kLog("Join", m.user, `<@${m.id}> ist beigetreten.\nErstellt: <t:${Math.floor(m.user.createdTimestamp/1000)}:R>`, "#ffffff", m.user.displayAvatarURL()));
  
  client.on(Events.GuildMemberRemove, m => kLog("Leave", m.user, `<@${m.id}> ist gegangen.`, "#ff0000", m.user.displayAvatarURL()));

  client.on(Events.GuildUpdate, (o, n) => {
    if (o.name !== n.name) kLog("Server Name geändert", null, `Alt: ${o.name}\nNeu: ${n.name}`);
    if (o.icon !== n.icon) kLog("Server Icon geändert", null, "Das Server-Icon wurde aktualisiert.", "#ffffff", n.iconURL());
  });

  client.on(Events.GuildMemberUpdate, (o, n) => {
    const roles = n.roles.cache.filter(r => !o.roles.cache.has(r.id)).map(r => r.toString()).concat(
                  o.roles.cache.filter(r => !n.roles.cache.has(r.id)).map(r => `- ${r.toString()}`));
    if (roles.length) kLog("Rollen-Update", n.user, roles.join("\n"));
  });

  client.on(Events.GuildAuditLogEntryCreate, async (entry) => {
    const { action, executorId, targetId } = entry;
    const exec = await client.users.fetch(executorId).catch(() => null);
    
    if (action === AuditLogEvent.MemberBanAdd) kLog("BAN", exec, `Ziel: <@${targetId}>`, "#ff0000");
    if (action === AuditLogEvent.MemberKick) kLog("KICK", exec, `Ziel: <@${targetId}>`, "#ff0000");
    if (action === AuditLogEvent.WebhookCreate) kLog("Webhook erstellt", exec, `Ein neuer Webhook wurde generiert.`, "#ffca00");
    if (action === AuditLogEvent.ChannelUpdate) kLog("Kanal-Rechte geändert", exec, `Berechtigungen für <#${targetId}> wurden angepasst.`);
    if (action === AuditLogEvent.RoleCreate) kLog("Rolle erstellt", exec, `Eine neue Rolle wurde angelegt.`);
    if (action === AuditLogEvent.RoleDelete) kLog("Rolle gelöscht", exec, `Eine Rolle wurde entfernt.`);
    if (action === AuditLogEvent.ChannelPermissionsUpdate) kLog("Berechtigungen aktualisiert", exec, `Berechtigungen in <#${targetId}> wurden modifiziert.`);
  });

  client.on(Events.GuildInviteCreate, i => kLog("Invite erstellt", i.inviter, `Code: \`${i.code}\`\nKanal: ${i.channel}`, "#ffffff"));
}
