# Installing Brandywine

Brandywine runs on any server or computer with Docker. Installing takes one
command and a few questions; the rest happens in your browser.

## What you need

- A Linux server (Ubuntu, Debian, Fedora…) or a Mac, with **2 GB of memory**
  and **5 GB of free disk space** or more
- **Docker** with Compose v2 — the installer offers to install it on Linux
- For a public installation: a **domain name** (e.g. `brand.example.com`)
  whose DNS A record points to the server, and ports **80 and 443** open

Try it on your own computer first if you like — the installer has a
"this computer only" option that needs no domain.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/yaneczech/Brandywine/main/install.sh | sh
```

This downloads the latest release into `~/brandywine` (`/opt/brandywine`
when run as root) and starts the installer, which:

1. **checks the computer** — Docker, memory, disk space;
2. **asks for the address** — a domain with automatic HTTPS, or this computer
   only. For a domain it checks the DNS record and that ports 80 and 443 are
   free; for a local install it picks free ports by itself;
3. **offers e-mail setup** (optional) — an SMTP server for sign-in links and
   password resets. Skip it and e-mails are written to the log instead;
4. **shows a summary** and asks before changing anything;
5. **starts Brandywine** — it downloads ready-made images (or builds from source
   when they are unavailable), creates the database and waits until
   everything answers.

It ends with the address to open. Secrets are generated for you and stored in
`.env`; you never need to edit it by hand.

Prefer to look before you run? Clone the repository and start the same
installer yourself:

```bash
git clone https://github.com/yaneczech/Brandywine.git
cd Brandywine
./brandywine install
```

### Finish in the browser

Open the address the installer printed (it ends in `/admin/setup`). First you
create the administrator account, then a short wizard asks for:

1. **Your brand** — name, main colour, logo and the manual's language;
2. **Access** — who may read the manual: anyone with the link, or everyone
   with a shared password;
3. **Content** — start with an **example manual** in your colours and
   language, or with an empty one.

You can skip the wizard and finish it later from the dashboard.

That's it: the manual is live at your address and the admin at `/admin`.

### Installing without questions

For scripts and provisioning tools, pass everything on the command line:

```bash
./brandywine install --domain brand.example.com --yes
./brandywine install --local --http-port 8080 --yes
```

| Option | |
| --- | --- |
| `--domain NAME` | Serve on NAME with automatic HTTPS |
| `--local` | Only on this computer (`http://localhost`) |
| `--http-port N` | Port for `--local` (default 80, else the first free of 8080, 8081, 8088) |
| `--reconfigure` | Answer the questions again; secrets and data are kept |
| `--build` | Build from source instead of downloading images |
| `--yes` | Take the defaults and ask nothing |

With the one-line installer, add options after `sh -s --`:

```bash
curl -fsSL https://raw.githubusercontent.com/yaneczech/Brandywine/main/install.sh | sh -s -- --domain brand.example.com
```

`BRANDYWINE_DIR` chooses the folder, `BRANDYWINE_REF` a release tag or branch.

## Everyday operations

Run these in the Brandywine folder:

| Command | |
| --- | --- |
| `./brandywine doctor` | Check the configuration, services, migrations and disk space |
| `./brandywine backup` | Back up the database, uploaded files and plugins into `backups/` |
| `./brandywine restore backups/<date>` | Restore a backup (a safety backup is made first) |
| `./brandywine update` | Back up, then update to the newest release |
| `./brandywine start` / `stop` / `restart` | Control the services |
| `./brandywine logs` | Follow the logs |
| `./brandywine uninstall` | Stop and remove the containers; your data stays |
| `./brandywine uninstall --purge` | Remove everything, including the data (a final backup is made) |

Keep copies of `backups/` somewhere other than the server.

## Changing settings later

- **Address or e-mail** — `./brandywine install --reconfigure`
- **Brand, colours, access, languages** — in the admin, under Brand and Settings
- **Anything else** — `.env` (see [`.env.example`](../.env.example) for every
  option), then `./brandywine restart`

## Troubleshooting

**"Port 80 is already in use"** — another web server (nginx, Apache) runs on
the server. Stop it, or put Brandywine behind it and install with
`--local --http-port 8080`, forwarding your domain to that port.

**The HTTPS certificate does not appear** — check that the domain's A record
points to this server and that ports 80 and 443 are reachable from the
internet (firewall, cloud security group). Brandywine retries on its own.

**"Docker is installed but not running"** — start Docker Desktop, or run
`sudo systemctl start docker`. On Linux, either use `sudo` or add your user to
the `docker` group and log in again.

**Something else** — `./brandywine doctor` names the failing part and
`./brandywine logs` shows why. Open an
[issue](https://github.com/yaneczech/Brandywine/issues) with the output if you
are stuck.
