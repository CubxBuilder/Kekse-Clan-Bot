import { EmbedBuilder, Events, AuditLogEvent } from "discord.js";

const LOG_ID = "1423413348220796991";

export function initAuditLogs(client) {

    const sendLog = async (title, user, text, color = "#ffffff", thumb = null, channelId = null) => {
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
            .setFooter({ text: 'Kekse Clan Security | Master Log' })
            .setTimestamp();

        if (thumb) embed.setThumbnail(thumb);
        await chan.send({ embeds: [embed] }).catch(() => {});
    };

    client.on(Events.MessageDelete, async (msg) => {
        if (msg.partial || msg.author?.bot || msg.channel.id === LOG_ID) return;
        const ghostPing = msg.mentions.users.size > 0 ? "⚠️ **GHOST PING ERKANNT**\n" : "";
        await sendLog("Nachricht gelöscht", msg.author, `${ghostPing}**Kanal:** ${msg.channel}\n**Inhalt:**\n\`\`\`${msg.content || "Kein Textinhalt"}\`\`\``, "#ffffff", null, msg.channel.id);
    });

    client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
        if (oldMsg.partial || oldMsg.content === newMsg.content || oldMsg.author?.bot || oldMsg.channel.id === LOG_ID) return;
        await sendLog("Nachricht editiert", oldMsg.author, `**Kanal:** ${oldMsg.channel}\n**Vorher:**\n\`\`\`${oldMsg.content}\`\`\`\n**Nachher:**\n\`\`\`${newMsg.content}\`\`\``, "#ffffff", null, oldMsg.channel.id);
    });

    client.on(Events.GuildMemberAdd, async (member) => {
        await sendLog("User Join", member.user, `<@${member.id}> (${member.user.tag}) ist beigetreten.\nAccount erstellt: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, "#ffffff", member.user.displayAvatarURL());
    });

    client.on(Events.GuildMemberRemove, async (member) => {
        await sendLog("User Leave", member.user, `<@${member.id}> (${member.user.tag}) ist gegangen oder wurde entfernt.`, "#f04747", member.user.displayAvatarURL());
    });

    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        if (oldMember.nickname !== newMember.nickname) {
            await sendLog("Nickname geändert", newMember.user, `Alt: \`${oldMember.nickname || "Kein"}\`\nNeu: \`${newMember.nickname || "Kein"}\``);
        }
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        if (addedRoles.size > 0) await sendLog("Rolle vergeben", newMember.user, `Hinzugefügt: ${addedRoles.map(r => r.name).join(", ")}`, "#43b581");
        if (removedRoles.size > 0) await sendLog("Rolle entfernt", newMember.user, `Entfernt: ${removedRoles.map(r => r.name).join(", ")}`, "#f04747");
    });

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const user = newState.member.user;
        if (!oldState.channelId && newState.channelId) {
            await sendLog("VC Join", user, `Kanal: <#${newState.channelId}>`, "#ffffff");
        } else if (oldState.channelId && !newState.channelId) {
            await sendLog("VC Leave", user, `Kanal: <#${oldState.channelId}>`, "#ffffff");
        } else if (oldState.channelId !== newState.channelId) {
            await sendLog("VC Wechsel", user, `<#${oldState.channelId}> ➔ <#${newState.channelId}>`, "#ffffff");
        }
        if (!oldState.selfMute && newState.selfMute) {
            await sendLog("User gestummt (VC)", user, `In Kanal: <#${newState.channelId}>`);
        }
    });

    client.on(Events.GuildAuditLogEntryCreate, async (entry) => {
        const { action, executorId, targetId } = entry;
        const executor = await client.users.fetch(executorId).catch(() => null);

        if (action === AuditLogEvent.ChannelCreate) {
            await sendLog("Channel erstellt", executor, `ID: <#${targetId}>\nEin neuer Kanal wurde angelegt.`);
        }
        if (action === AuditLogEvent.ChannelDelete) {
            await sendLog("Channel gelöscht", executor, `ID: \`${targetId}\` (Kanal wurde entfernt)`, "#ffffff");
        }
        if (action === AuditLogEvent.ChannelUpdate) {
            await sendLog("Channel aktualisiert", executor, `Einstellungen in <#${targetId}> wurden geändert.`);
        }
        if (action === AuditLogEvent.ChannelOverwriteUpdate || action === AuditLogEvent.ChannelOverwriteCreate || action === AuditLogEvent.ChannelOverwriteDelete) {
            await sendLog("Channel Permissions aktualisiert", executor, `Berechtigungen in <#${targetId}> wurden modifiziert.`, "#ffffff");
        }

        if (action === AuditLogEvent.ThreadCreate) {
            await sendLog("Thread erstellt", executor, `Thread: <#${targetId}>`);
        }
        if (action === AuditLogEvent.ThreadDelete) {
            await sendLog("Thread gelöscht", executor, `Ein Thread wurde entfernt.`, "#ffffff");
        }
        if (action === AuditLogEvent.ThreadUpdate) {
            await sendLog("Thread aktualisiert", executor, `Thread <#${targetId}> wurde bearbeitet.`);
        }

        if (action === AuditLogEvent.RoleCreate) {
            await sendLog("Rolle erstellt", executor, `Eine neue Rolle wurde angelegt.`);
        }
        if (action === AuditLogEvent.RoleDelete) {
            await sendLog("Rolle gelöscht", executor, `ID: \`${targetId}\` (Rolle wurde entfernt)`, "#ffffff");
        }
        if (action === AuditLogEvent.RoleUpdate) {
            await sendLog("Rolle aktualisiert", executor, `Die Rolle <@&${targetId}> wurde bearbeitet.`);
        }

        if (action === AuditLogEvent.InviteCreate) {
            await sendLog("Invite erstellt", executor, `Ein neuer Einladungslink wurde generiert.`);
        }

        if (action === AuditLogEvent.GuildUpdate) {
            await sendLog("Server aktualisiert", executor, `Die allgemeinen Server-Einstellungen wurden geändert.`, "#ffffff");
        }

        if (action === AuditLogEvent.MemberBanAdd) await sendLog("BAN", executor, `Ziel: <@${targetId}>`, "#ffffff");
        if (action === AuditLogEvent.MemberBanRemove) await sendLog("UNBAN", executor, `Ziel: <@${targetId}>`, "#ffffff");
        if (action === AuditLogEvent.MemberKick) await sendLog("KICK", executor, `Ziel: <@${targetId}>`, "#ffffff");
    });

    client.on(Events.GuildInviteCreate, async (invite) => {
        await sendLog("Invite gesendet", invite.inviter, `Code: \`${invite.code}\`\nKanal: <#${invite.channelId}>`);
    });
}
