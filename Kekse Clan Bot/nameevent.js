export function initForumWatch(client) {
  const FORUM_CHANNEL_ID = "1472668820148715661";
  const POSTER_ROLE_ID = "1473027498680909934";
  const ADMIN_ROLE_ID = "1423427747103113307";
  const DUPLICATE_TAG_ID = "1473291936562675797";

  client.on("threadCreate", async (thread) => {
    if (thread.parentId !== FORUM_CHANNEL_ID) return;

    setTimeout(async () => {
      const guild = thread.guild;
      const ownerId = thread.ownerId;
      if (!ownerId) return;

      try {
        const member = await guild.members.fetch(ownerId);
        const forumChannel = thread.parent;

        const activeThreads = forumChannel.threads.cache.filter(t => t.ownerId === ownerId && !t.archived);
        
        const threadCount = activeThreads.size;

        if (threadCount === 1) {
          if (!member.roles.cache.has(POSTER_ROLE_ID)) {
            await member.roles.add(POSTER_ROLE_ID);
            console.log(`[FORUM] Rolle an ${member.user.username} vergeben.`);
          }
        } 
        else if (threadCount >= 2) {
          if (member.roles.cache.has(POSTER_ROLE_ID)) {
            await member.roles.remove(POSTER_ROLE_ID);
          }
          for (const [id, userThread] of activeThreads) {
            await userThread.setAppliedTags([DUPLICATE_TAG_ID]);
            await userThread.send({
              content: `⚠️ <@&${ADMIN_ROLE_ID}>, der Bot hat erkannt, dass dieser User einen zweiten Post geöffnet hat. `
            });
          }
          console.log(`[FORUM] Double-Post erkannt von ${member.user.username}.`);
        }
      } catch (err) {
        console.error("[FORUM] Fehler bei Thread-Verarbeitung:", err);
      }
    }, 2000);
  });
}
