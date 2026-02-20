import { EmbedBuilder, Events, AuditLogEvent, PermissionFlagsBits } from "discord.js";

const LOG_ID = "1423413348220796991";

export function initAuditLogs(client) {

    const sendLog = async (title, user, text, color = "#ffffff", thumb = null) => {
        const chan = client.channels.cache.get(LOG_ID);
        if (!chan) return;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ 
                name: user?.tag || "System / Unbekannt", 
                iconURL: user?.displayAvatarURL() || client.user.displayAvatarURL() 
            })
            .setDescription(`**Event:** \`${title}\`\n${text}`)
            .setFooter({ text: 'Kekse Clan Security' })
            .setTimestamp();

        if (thumb) embed.setThumbnail(thumb);
        await chan.send({ embeds: [embed] }).catch(() => {});
    };

    client.on(Events.MessageDelete, async (msg) => {
        if (msg.partial || msg.author?.bot || msg.channel.id === LOG_ID) return;
        const ghostPing = msg.mentions.users.size > 0 ? "⚠️ **GHOST PING ERKANNT**\n" : "";
        await sendLog("Nachricht gelöscht", msg.author, `${ghostPing}**Kanal:** ${msg.channel}\n**Inhalt:**\n\`\`\`${msg.content || "Kein Textinhalt"}\`\`\``, "#ff4b4b");
    });

    client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
        if (oldMsg.partial || oldMsg.content === newMsg.content || oldMsg.author?.bot || oldMsg.channel.id === LOG_ID) return;
        await sendLog("Nachricht editiert", oldMsg.author, `**Kanal:** ${oldMsg.channel}\n**Vorher:**\n\`\`\`${oldMsg.content}\`\`\`\n**Nachher:**\n\`\`\`${newMsg.content}\`\`\``, "#ffca00");
    });

    client.on(Events.GuildMemberAdd, async (member) => {
        await sendLog("User Join", member.user, `<@${member.id}> (${member.user.tag}) ist beigetreten.\nAccount erstellt: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, "#ffffff", member.user.displayAvatarURL());
    });

    client.on(Events.GuildMemberRemove, async (member) => {
        await sendLog("User Leave", member.user, `<@${member.id}> (${member.user.tag}) ist gegangen.`, "#ff0000", member.user.displayAvatarURL());
    });

    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        if (oldMember.nickname !== newMember.nickname) {
            await sendLog("Nickname geändert", newMember.user, `Alt: ${oldMember.nickname || "Kein"}\nNeu: ${newMember.nickname || "Kein"}`);
        }
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        if (addedRoles.size > 0) await sendLog("Rolle vergeben", newMember.user, `Hinzugefügt: ${addedRoles.map(r => r.name).join(", ")}`, "#ffffff");
        if (removedRoles.size > 0) await sendLog("Rolle entfernt", newMember.user, `Entfernt: ${removedRoles.map(r => r.name).join(", ")}`, "#ff0000");
    });

    client.on(Events.ChannelCreate, async (channel) => {
        await sendLog("Kanal erstellt", null, `Name: <#${channel.id}> (${channel.name})\nTyp: ${channel.type}`);
    });

    client.on(Events.ChannelDelete, async (channel) => {
        await sendLog("Kanal gelöscht", null, `Name: ${channel.name}\nTyp: ${channel.type}`, "#ff0000");
    });

    client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
        if (oldChannel.name !== newChannel.name) {
            await sendLog("Kanal aktualisiert (Name)", null, `Alt: ${oldChannel.name}\nNeu: ${newChannel.name}`);
        }
        if (JSON.stringify(oldChannel.permissionOverwrites) !== JSON.stringify(newChannel.permissionOverwrites)) {
            await sendLog("Channel Permissions aktualisiert", null, `Berechtigungen in <#${newChannel.id}> wurden geändert.`);
        }
    });

    client.on(Events.ThreadCreate, async (thread) => {
        await sendLog("Thread erstellt", null, `Name: ${thread.name}\nKanal: <#${thread.parentId}>`);
    });

    client.on(Events.ThreadDelete, async (thread) => {
        await sendLog("Thread gelöscht", null, `Name: ${thread.name}`, "#ff0000");
    });

    client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
        if (oldGuild.name !== newGuild.name) await sendLog("Server aktualisiert (Name)", null, `Alt: ${oldGuild.name}\nNeu: ${newGuild.name}`);
        if (oldGuild.icon !== newGuild.icon) await sendLog("Server aktualisiert (Icon)", null, `Das Server-Icon wurde geändert.`, "#ffffff", newGuild.iconURL());
    });

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const user = newState.member.user;
        if (!oldState.channelId && newState.channelId) {
            await sendLog("VC Join", user, `Kanal: <#${newState.channelId}>`);
        } else if (oldState.channelId && !newState.channelId) {
            await sendLog("VC Leave", user, `Kanal: <#${oldState.channelId}>`, "#ff0000");
        } else if (oldState.channelId !== newState.channelId) {
            await sendLog("VC Wechsel", user, `<#${oldState.channelId}> ➔ <#${newState.channelId}>`);
        }
        if (!oldState.selfMute && newState.selfMute) {
            await sendLog("User gestummt (VC)", user, `Stummgeschaltet in <#${newState.channelId}>`);
        }
    });

    client.on(Events.GuildAuditLogEntryCreate, async (entry) => {
        const { action, executorId, targetId } = entry;
        const executor = await client.users.fetch(executorId).catch(() => null);

        if (action === AuditLogEvent.RoleCreate) await sendLog("Rolle erstellt", executor, `Eine neue Rolle wurde angelegt.`);
        if (action === AuditLogEvent.RoleDelete) await sendLog("Rolle gelöscht", executor, `Rolle wurde gelöscht.`, "#ff0000");
        if (action === AuditLogEvent.RoleUpdate) await sendLog("Rolle aktualisiert", executor, `Einstellungen der Rolle wurden geändert.`);
        if (action === AuditLogEvent.MemberBanAdd) await sendLog("BAN", executor, `Ziel: <@${targetId}>`, "#ff0000");
        if (action === AuditLogEvent.MemberKick) await sendLog("KICK", executor, `Ziel: <@${targetId}>`, "#ff0000");
    });

    client.on(Events.GuildInviteCreate, async (invite) => {
        await sendLog("Invite erstellt", invite.inviter, `Code: \`${invite.code}\`\nKanal: <#${invite.channelId}>`);
    });
}
