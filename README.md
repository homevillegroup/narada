# NARADA

A lightweight web interface for managing WireGuard VPN users. Built over a weekend to make WireGuard management less painful.

## What it does

- Add/remove WireGuard users via a web UI
- Shows who's connected and their data usage
- Download client configs with one click
- Simple email-based user creation

No fancy enterprise features, just the basics that work.

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/narada.git
cd narada
npm install

# Set up environment (optional)
cp .env.example .env

# Make sure your user can read/write the WireGuard config
sudo chown $USER:www-data /etc/wireguard/wg0.conf
sudo chmod 664 /etc/wireguard/wg0.conf

# Start it up
npm start
```

Open `http://localhost:3000` and login with `admin` / `wireguard123`

## Configuration

Set these in your `.env` file if you want to change defaults:

```bash
PORT=3000
WG_CONFIG_PATH=/etc/wireguard/wg0.conf
ADMIN_USERNAME=admin
ADMIN_PASSWORD=wireguard123
JWT_SECRET=your-secret-key
```

## How it works

- Reads your existing WireGuard config file
- Users are identified by comments in the config
- Enable/disable by commenting/uncommenting peer sections
- Automatically assigns IP addresses
- Shows real-time connection status from `wg show`

## Usage

1. **Add users**: Enter an email, username gets extracted automatically
2. **Download configs**: One-click client config download
3. **Enable/disable**: Toggle users on/off
4. **Monitor**: See who's connected and their data usage

The interface sorts connected users first and lets you sort by usage or status.

## API

Basic REST API if you want to automate things:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"username":"admin","password":"wireguard123"}'

# List users
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/users/status

# Add user
curl -X POST -H "Authorization: Bearer TOKEN" \
  -d '{"email":"user@example.com"}' \
  http://localhost:3000/api/users
```

## Troubleshooting

- **Permission denied**: Make sure the app can read/write your WireGuard config
- **Port in use**: Change the port in your `.env` file
- **Config not found**: Check that `/etc/wireguard/wg0.conf` exists

## License

MIT License - Copyright (c) 2024 Homeville Consulting Private Limited

Originally created by Sachit Kumar (y-sachit). Open sourced for the community.