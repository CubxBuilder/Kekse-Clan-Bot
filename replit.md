# Kekse Clan Bot

## Overview

A Discord bot built for the "Kekse Clan" community server. The bot provides comprehensive server management features including moderation tools, ticket systems, giveaways, counting games, reminders, and automated reactions. It includes a web-based dashboard for administration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure
- **Entry Point**: `Kekse Clan Bot/app.js` - Initializes the Discord client and loads all feature modules
- **Modular Design**: Each feature is isolated in its own file with an `init` function that receives the Discord client
- **ES Modules**: Uses modern JavaScript module syntax (`import`/`export`)

### Feature Modules
| Module | Purpose |
|--------|---------|
| `counting.js` | Manages a counting game channel with scoreboard tracking |
| `moderation.js` | Timeout, kick, ban, warn commands for moderators |
| `dtickets.js` | Reaction-based ticket system with categories (Support, Abholung, Bewerbung) |
| `giveaway.js` | Timed giveaways with emoji reactions and winner selection |
| `messages.js` | Admin commands for sending messages/embeds to channels |
| `reminder.js` | User reminders with duration or absolute time support |
| `reactions.js` | Automated responses to specific message content (cookies, pings) |
| `help.js` | Simple help command directing users to ticket creation |
| `ids.js` | Exports server structure (channels, users) to JSON |
| `ping.js` | Bot latency measurement command |

### Data Persistence
- **JSON File Storage**: All persistent data stored in JSON files within `Kekse Clan Bot/` directory
- Files: `counting.json`, `moderation.json`, `tickets.json`, `reminders.json`, `ids.json`
- Closed tickets archived to `closed_tickets/` directory

### Web Dashboard
- Static HTML/CSS/JS frontend in `public/` directory
- Express server configured but routes not fully implemented
- Provides UI for executing bot commands and viewing ticket archives

### Command System
- Prefix-based commands using `!` character
- Role-based permissions (Team role ID: `1457906448234319922`)
- Discord.js permissions checks for moderation commands

## External Dependencies

### Core Dependencies
| Package | Purpose |
|---------|---------|
| `discord.js` v14 | Discord API interaction, message handling, embeds |
| `express` v5 | Web server for dashboard |
| `dotenv` | Environment variable management |

### Environment Variables
- `BOT_TOKEN` - Discord bot authentication token

### Discord API Requirements
- Gateway Intents: Guilds, GuildMessages, MessageContent, GuildMessageReactions, GuildMembers
- Partials: Channel, Message, Reaction (for reaction handling on uncached messages)

### File System
- Read/write access to JSON data files for persistence
- No external database - all data stored locally