<p align="center">
  <img src="src/resources/images/pratinavv_logo.png" width="140" alt="pratinavv logo">
</p>

<h1 align="center">pratinavv</h1>

<p align="center">One Discord bot for all your Rust teams: live alerts, team chat and team status.</p>

---

## What it does

- **Many teams, one bot.** Players create and join teams themselves. Each team gets its own role and private channels.
- **One alert per event.** Each team uses a single Rust+ connection, so a cargo ship shows up once however many members the team has.
- **Live alerts.** Cargo Ship, Patrol Helicopter, Chinook, Oil Rig crates and heavy scientists, Traveling Vendor and vending machines.
- **Two-way team chat.** Messages move between Discord and in-game team chat.
- **Live information.** Server stats, active events, team status and the map stay up to date in one channel.
- **Simple settings.** Each alert has one on or off switch that covers both Discord and team chat.

Each team gets three channels:

| Channel | Purpose |
|---|---|
| `information` | Server, live events, team status, map and settings |
| `events` | Alerts and activity notices |
| `teamchat` | Chat linked with in-game team chat |

## Join a team

1. Download the [credential app](https://github.com/alexemanuelol/rustplusplus-credential-application/releases/download/v1.4.0/rustplusplus-1.4.0-win-x64.exe) and log in with Steam.
2. Run `/credentials add` in Discord with the details it gives you. Only you can see the reply.
3. Run `/team join` and pick a team.

To be able to lead a team later, also open the Rust+ menu in Rust and click **Pair with Server** for that team's server.

## Create a team

1. Do steps 1 and 2 above.
2. In Rust, open the Rust+ menu and click **Pair with Server**.
3. Run `/team create` and give your team a name.

You become its leader, and the bot creates the role and channels. A team belongs to one server and lasts one wipe: it closes when the server wipes or when the leader runs `/team end-wipe`. Its channels are deleted 7 days later.

> **Open teams:** anyone with credentials can join any team, then read its channels and post into its in-game team chat. Leaders can remove people with `/team kick`.

## Commands

### Team

| Command | Who | What it does |
|---|---|---|
| `/team create` | Anyone | Start a team on the server you paired with |
| `/team join` | Anyone | Pick a team to join |
| `/team leave` | Members | Leave the team |
| `/team info` | Members | Show the leader, server and members |
| `/team rename` | Leader | Rename the team, its role and category |
| `/team pass-leader` | Leader | Hand leadership to a paired member |
| `/team kick` | Leader | Remove a member |
| `/team end-wipe` | Leader | Close the team and stop its alerts |

Server admins can also use the leader commands. If you are in more than one team, run team commands inside the channels of the team you mean.

### Credentials

| Command | What it does |
|---|---|
| `/credentials add` | Register or renew your credentials |
| `/credentials show` | Show your Steam ID, expiry date and teams |
| `/credentials remove` | Remove your credentials |

### Lookups and tools

`/alias` `/blacklist` `/cctv` `/craft` `/decay` `/despawn` `/help` `/item` `/leader` `/map` `/market` `/recycle` `/research` `/reset` `/stack` `/upkeep` `/uptime`

### In-game

Type these in team chat, for example `!cargo`, `!heli`, `!small`, `!large`, `!chinook`, `!vendor`, `!pop`, `!time`, `!online`, `!offline`, `!team`, `!upkeep`, `!craft`, `!recycle`, `!stack`, `!timer` or `!tr`.

`!leader` makes you the in-game team leader, which is separate from the Discord team leader. It only works if the current in-game leader has registered credentials.

## Host it yourself

You need [Node.js](https://nodejs.org) 20 or newer and a [Discord application](https://discord.com/developers/applications) with a bot. The code also uses [GraphicsMagick](http://www.graphicsmagick.org) when drawing parts of the map.

1. In the Discord developer portal, turn on the **Server Members** and **Message Content** privileged intents.
2. Invite the bot to your server with the `bot` and `applications.commands` scopes. It needs to manage roles and channels.
3. Copy `.env.example` to `.env` and fill in your application ID and bot token.
4. Install and start:

```bash
npm install
```

```bash
npm start
```

On Windows you can use `start-bot.bat` instead, which loads `.env` for you.

Team data, credentials and logs are saved in `data/`. **Never share `.env` or `data/`:** they hold your bot token and your players' Rust+ credentials.

## Security

Everyone who registers gives the bot host their Rust+ credentials, and these are stored unencrypted in `data/`. Only register with a bot run by someone you trust.

## Credits and license

pratinavv is built on [rustplusplus](https://github.com/alexemanuelol/rustplusplus) and uses [rustplus.js](https://github.com/liamcottle/rustplus.js). See [NOTICE.md](NOTICE.md) for details.

Licensed under the [GNU General Public License v3.0](LICENSE).

pratinavv is a fan project and is not affiliated with Facepunch Studios, Rust or Discord.
