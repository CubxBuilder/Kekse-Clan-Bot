import { ChannelType, PermissionFlagsBits } from "discord.js";

const CREATOR_CHANNEL_ID = "1423438527319900180"; 
const CATEGORY_ID = "1423413348493430902";        
const TEAM_ROLE_ID = "1457906448234319922";

const activeCreations = new Set();

function toMonospace(text) {
  const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const mono = "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿";
  const map = {};
  for (let i = 0; i < normal.length; i++) {
    map[normal[i]] = mono.slice(i * 2, i * 2 + 2);
  }
  return text.split('').map(char => map[char] || char).join('');
}

export function initVoiceChannels(client) {
  client.on("voiceStateUpdate", async (oldState, newState) => {
    const { member, guild } = newState;
    if (!member || member.user.bot) return;

    if (newState.channelId === CREATOR_CHANNEL_ID) {
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
            { 
              id: guild.id, 
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] 
            },
            { 
              id: TEAM_ROLE_ID, 
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] 
            },
            {
              id: member.id,
              allow: [
                PermissionFlagsBits.ViewChannel, 
                PermissionFlagsBits.Connect, 
                PermissionFlagsBits.ManageChannels, 
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers
              ]
            }
          ]
        });
        await newState.setChannel(tempChannel).catch(async () => {
            await tempChannel.delete().catch(() => {});
        });
        
      } catch (err) {
        console.error("[VOICE] Fehler beim Erstellen:", err);
      } finally {
        setTimeout(() => activeCreations.delete(member.id), 5000);
      }
    }

    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.parentId === CATEGORY_ID && oldChannel.id !== CREATOR_CHANNEL_ID) {
      try {
        const freshChannel = await guild.channels.fetch(oldChannel.id).catch(() => null);
        if (freshChannel && freshChannel.members.size === 0) {
          await freshChannel.delete().catch(() => {});
          console.log(`[VOICE] Leere Lounge ${freshChannel.name} entfernt.`);
        }
      } catch (err) {
      }
    }
  });
}
