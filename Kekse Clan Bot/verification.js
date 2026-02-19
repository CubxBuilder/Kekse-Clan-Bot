import { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
const VERIFY_CHANNEL_ID = "1439337595090898955";
const UNVERIFIED_ROLE_ID = "1439337577508245837";
const TEAM_ROLE_ID = "1457906448234319922";
const LOG_CHANNEL_ID = "1423413348220796991";
export function initVerification(client) {
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
      .setFooter({ text: 'Kekse Clan | Verification System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  client.on("guildMemberAdd", async (member) => {
    await member.roles.add(UNVERIFIED_ROLE_ID).catch(() => {});
  });
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== "verify_user") return;   
    const member = interaction.member;
    if (!member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
      return interaction.reply({ 
        content: "Du bist bereits verifiziert.", 
        ephemeral: true 
      });
    }
    try {
      await member.roles.remove(UNVERIFIED_ROLE_ID);
      await sendKekseLog("User Verifiziert", interaction.user, `Der User hat den Button genutzt und die Rolle <@&${UNVERIFIED_ROLE_ID}> wurde entfernt.`);
      
      await interaction.reply({ 
        content: "Erfolgreich verifiziert!", 
        ephemeral: true 
      });
    } catch (err) {
      await interaction.reply({ 
        content: "Fehler: Meine Rolle steht in der Liste vermutlich unter der Verifizierungs-Rolle.", 
        ephemeral: true 
      });
    }
  });

  client.on("messageCreate", async (msg) => {
    if (msg.content === "!setup_verify") {
      if (!msg.member.roles.cache.has(TEAM_ROLE_ID)) return;
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_user")
          .setLabel("Verifizieren")
          .setStyle(ButtonStyle.Success)
      );
      const channel = client.channels.cache.get(VERIFY_CHANNEL_ID);
      if (channel) {
        const imageUrl = new AttachmentBuilder('./Kekse Clan Bot/verify.png');
        
        await channel.send({ 
          content: "**Willkommen!** Klicke auf den Button, um die Verifizierung abzuschließen.",
          files: [imageUrl],
          components: [row] 
        });

        await sendKekseLog("Verification Setup", msg.author, `Das Verifizierungs-Panel wurde in <#${VERIFY_CHANNEL_ID}> neu aufgesetzt.`);
        
        await msg.delete().catch(() => {});
      }
    }
  });
}
