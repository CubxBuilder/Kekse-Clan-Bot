import { ChannelType, PermissionFlagsBits, EmbedBuilder } from "discord.js";

const CREATOR_CHANNEL_ID = "1423413348220796991";
const LOG_CHANNEL_ID = "1423413348220796991"; 
const CATEGORY_ID = "1423413348493430902";        
const TEAM_ROLE_ID = "1457906448234319922";
const TRIGGER_CHANNEL_ID = "1423438527319900180"; 

const activeCreations = new Set();

function toMonospace(text) {
  const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const mono = "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿";
  let result = "";
  for (let char of text) {
    const idx = normal.indexOf(char);
    result += idx !== -1 ? mono.slice(idx * 2, idx * 2 + 2) : char;
  }
  return result;
}

export function initVoiceChannels(client) {
  
  const sendKekseLog = async (action, user, details) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;
    const logEmbed = new EmbedBuilder()
      .setColor('#ffffff')
      .setAuthor({ 
          name: user.username, 
          iconURL: user.displayAvatarURL({ size: 512 }) 
      })
      .setDescription(`**Aktion:** \`${action}\`\n${details}`)
      .setFooter({ text: 'Kekse Clan | Voice System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };

  client.on("voiceStateUpdate", async (oldState, newState) => {
    const { member, guild } = newState;
    if (!member || member.user.bot) return;

    if (newState.channelId === TRIGGER_CHANNEL_ID) {
      if (activeCreations.has(member.id)) return;
      activeCreations.add(member.id);

      try {
        const userNameMono = toMonospace(member.user.username);
        const channelName = `${userNameMono}'𝚜 𝙻𝚘𝚞𝚗𝚐𝚎`;

        const tempChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: CATEGORY_ID,
          permissionOverwrites: [
            { id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
            { id: TEAM_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
            {
              id: member.id,
              allow: [
                PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, 
                PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers
              ]
            }
          ]
        });

        await newState.setChannel(tempChannel).catch(async () => {
            await tempChannel.delete().catch(() => {});
        });

        await sendKekseLog("Voice Lounge erstellt", member.user, `**Kanal:** \`${channelName}\`\n**ID:** \`${tempChannel.id}\``);
        
      } catch (err) {
        console.error("[VOICE] Fehler beim Erstellen:", err);
      } finally {
        setTimeout(() => activeCreations.delete(member.id), 5000);
      }
    }

    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.parentId === CATEGORY_ID && oldChannel.id !== TRIGGER_CHANNEL_ID) {
      try {
        const freshChannel = await guild.channels.fetch(oldChannel.id).catch(() => null);
        if (freshChannel && freshChannel.members.size === 0) {
          const channelName = freshChannel.name;
          await freshChannel.delete().catch(() => {});
          await sendKekseLog("Voice Lounge entfernt", member.user, `**Kanal:** \`${channelName}\` (automatisch gelöscht, da leer)`);
        }
      } catch (err) {}
    }
  });
}
