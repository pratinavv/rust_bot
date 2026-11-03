# Run pratinavv 24/7 on Oracle Cloud

This puts the bot on an Oracle Cloud Always Free server. It restarts by itself after crashes and reboots, and backs up its data every day.

**Only one copy of the bot can run at a time.** Two copies would both answer commands and double up on team chat and news.

## 1. Create the server

1. Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/). Your **home region** can't easily be changed later, so pick a nearby one, such as Singapore.
2. Go to **Compute → Instances → Create instance**.
3. **Image:** Canonical Ubuntu 24.04.
4. **Shape:** Ampere `VM.Standard.A1.Flex` with **1 OCPU and 6 GB memory**. Check that it says "Always Free-eligible".
   - If you get an "out of capacity" error, try another availability domain or try again later.
5. **SSH keys:** choose **Generate a key pair for me** and download the private key. Don't share it or lose it. Save it as `C:\Users\<you>\.ssh\pratinavv.key`.
6. Click **Create**, then copy the server's **public IP address**.

You don't need to open any ports. The bot only makes outgoing connections, so leave Oracle's firewall allowing SSH only.

## 2. Install the bot

Connect from PowerShell on your PC, replacing `SERVER_IP`:

```powershell
ssh -i $HOME\.ssh\pratinavv.key ubuntu@SERVER_IP
```

If it says your key is `UNPROTECTED`, run this once, then try again:

```powershell
icacls $HOME\.ssh\pratinavv.key /inheritance:r /grant:r "${env:USERNAME}:R"
```

Then run these on the server:

```bash
curl -fsSL https://raw.githubusercontent.com/pratinavv/rust_bot/main/deploy/setup-server.sh -o setup-server.sh
sudo bash setup-server.sh
```

Type `exit` when it finishes.

## 3. Move your data

1. **Close the bot window on your PC** so its data stops changing.
2. In PowerShell, from the bot folder on your PC, upload your data:

```powershell
ssh -i $HOME\.ssh\pratinavv.key ubuntu@SERVER_IP "install -d -m 700 /tmp/pratinavv-upload"
scp -i $HOME\.ssh\pratinavv.key -r .env data ubuntu@SERVER_IP:/tmp/pratinavv-upload/
```

3. Connect again and start the bot:

```bash
sudo /opt/pratinavv/deploy/import-data.sh
```

The upload holds your bot token and player credentials. This step moves it into place, locks it down and removes the upload folder.

## 4. Check it

```bash
sudo systemctl status pratinavv
sudo journalctl -u pratinavv -f
```

The first should say `active (running)`, and the logs should show `LOGGED IN AS`. Press `Ctrl+C` to leave the logs. Then run `/help` in `🤖・bot-commands` on Discord.

Your PC can now stay off. Keep your local `.env` and `data` folder private, and **don't run `start-bot.bat` again** unless you've stopped the server copy.

## Everyday commands

| Task | Command |
|---|---|
| Is it running? | `sudo systemctl status pratinavv` |
| Live logs | `sudo journalctl -u pratinavv -f` |
| Restart | `sudo systemctl restart pratinavv` |
| Stop | `sudo systemctl stop pratinavv` |
| Update to the newest code | `sudo bash setup-server.sh` |
| Back up now | `sudo /opt/pratinavv/deploy/backup.sh` |

## Backups

A backup runs every night and the newest 7 are kept in `/var/backups/pratinavv`. They're on the same server, so they won't survive losing it. Copy one to your PC now and then. These files hold your bot token and player credentials, so keep them private:

```bash
sudo cp "$(sudo ls -1t /var/backups/pratinavv/*.tar.gz | head -n 1)" /tmp/pratinavv-backup.tar.gz
sudo chown ubuntu /tmp/pratinavv-backup.tar.gz
```

```powershell
scp -i $HOME\.ssh\pratinavv.key ubuntu@SERVER_IP:/tmp/pratinavv-backup.tar.gz .
```

Then remove the copy from `/tmp` on the server:

```bash
rm /tmp/pratinavv-backup.tar.gz
```

## Oracle's limits

- **Stay within the free limits.** Check Oracle's [Always Free page](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm) and your console, since the limits have reportedly changed. Going over has reportedly gotten servers disabled.
- **Idle servers can be reclaimed.** Oracle can reportedly take back a free server if CPU, network and memory all stay low for 7 days, and this bot is light. Keep your backups current. Upgrading the account to pay-as-you-go is often suggested as a fix, but check the billing terms first.
