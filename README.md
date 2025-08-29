# NARADA

A modern, web-based UI controller for managing WireGuard VPN users. This single-page application allows you to easily add, disable, enable, and delete WireGuard users through an intuitive interface.

## Features

- **Secure Authentication**: Login system with JWT tokens and environment-based credentials
- **Email-based User Management**: Add users using email addresses with automatic username extraction
- **Automatic IP Assignment**: Finds the last used IP and assigns the next available one
- **Key Generation**: Automatically generates WireGuard key pairs for new users
- **Configuration Download**: Download client configuration files directly from the UI
- **User Validation**: Checks for existing users and IP conflicts
- **Confirmation Dialogs**: All actions require confirmation to prevent accidental changes
- **Real-time Stats**: View total, active, and disabled user counts
- **Configuration Parsing**: Automatically parses existing WireGuard configuration
- **Backup System**: Creates automatic backups before making changes
- **Responsive Design**: Works on desktop and mobile devices
- **Status Management**: Users are disabled by commenting out their configuration
- **No Delete Function**: Users can only be disabled, not permanently deleted for security

## Security

- **Authentication Required**: All API endpoints are protected with JWT authentication
- **Masked Keys**: Public and private keys are masked in the UI and logs for security
- **Session Management**: Automatic logout on token expiration
- **Environment-based Credentials**: Login credentials stored in environment variables
- **Secure Token Storage**: JWT tokens stored in browser localStorage with expiration

**Important Security Notes:**
- Change default credentials in production
- Use a strong JWT secret key
- Consider using HTTPS in production
- Regularly rotate JWT secrets

## How It Works

The controller manages users in the WireGuard configuration file (`/etc/wireguard/wg0.conf`) by:

1. **User Names**: Extracted from comments between `[Peer]` and `PrivateKey` lines
2. **Enable/Disable**: Controlled by commenting/uncommenting the entire peer section
3. **Configuration Structure**: Maintains the original WireGuard format

### Example Configuration Structure

```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 50101
PrivateKey = ***********=

[Peer]
#YSachit
PublicKey = **************
AllowedIPs = 10.0.0.2/32

#[Peer]
# amish.shah
#PublicKey = 03E/KbQXKfL40FAXX5OBbReOu+/7labgYL67fKCTDns=
#AllowedIPs = 10.0.0.6/32
```

## Configuration

### Environment Variables

The application supports the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port for the web server |
| `WG_CONFIG_PATH` | `/etc/wireguard/wg0.conf` | Path to the WireGuard configuration file |
| `NODE_ENV` | `development` | Environment mode (development/production) |
| `ADMIN_USERNAME` | `admin` | Admin username for login |
| `ADMIN_PASSWORD` | `wireguard123` | Admin password for login |
| `JWT_SECRET` | `your-super-secret-jwt-key-change-this-in-production` | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | `24h` | JWT token expiration time |
| `LOGO_URL` | `https://cdn.homevillegroup.com/logo/hvg_horizontal.svg` | Logo URL for branding |

### Configuration Examples

```bash
# Use a different WireGuard interface
export WG_CONFIG_PATH=/etc/wireguard/wg1.conf

# Run on a different port
export PORT=8080

# For development/testing with local config file
export WG_CONFIG_PATH=./wg0.conf

# Authentication (CHANGE THESE IN PRODUCTION!)
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your-secure-password
export JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Branding
export LOGO_URL=https://cdn.homevillegroup.com/logo/hvg_horizontal.svg

# Or use a .env file
echo "WG_CONFIG_PATH=/etc/wireguard/wg0.conf" > .env
echo "PORT=3000" >> .env
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- WireGuard installed and configured
- Proper file permissions for your WireGuard configuration file

### Setup

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional):
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit the .env file to customize settings
   nano .env
   ```

4. **Set proper permissions** (run as root or with sudo):
   ```bash
   # Ensure the application can read/write the WireGuard config
   sudo chown root:www-data /etc/wireguard/wg0.conf
   sudo chmod 664 /etc/wireguard/wg0.conf
   
   # If running the app as a specific user, add them to the appropriate group
   sudo usermod -a -G www-data your-username
   ```

5. **Start the server**:
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   
   # With custom config path
   WG_CONFIG_PATH=/path/to/your/wg0.conf npm start
   
   # With custom port
   PORT=8080 npm start
   ```

6. **Access the application**:
   Open your browser and navigate to `http://localhost:3000` (or your custom port)

## Usage

### Adding a New User

1. Click the "Add New User" button
2. Enter the user's **Email Address** (e.g., "john@example.com")
   - The username will be automatically extracted from the email (part before @)
   - The system will check if the user already exists
   - A new IP address will be automatically assigned (next available IP)
3. Click "Add User"
4. The system will:
   - Generate WireGuard keys automatically
   - Create the client configuration file
   - Add the user to the server configuration
   - Display the client configuration for download

### Managing Existing Users

- **Download Config**: Click the "Download" button to download the user's configuration file (requires confirmation)
- **Enable/Disable**: Click the "Enable" or "Disable" button on a user card (requires confirmation)
- **Reload**: Click "Reload Config" to refresh the user list from the configuration file (requires confirmation)

### Confirmation Dialogs

All actions now require confirmation to prevent accidental changes:
- Adding a new user
- Enabling/disabling a user
- Downloading configuration files
- Reloading configuration

### User Status

- **Active**: User configuration is uncommented and active
- **Disabled**: User configuration is commented out

## Scripts

The application uses shell scripts for WireGuard operations:

### `script/find_last_used_ip.sh`
- Finds the last assigned IP address in the WireGuard configuration
- Used to determine the next available IP for new users

### `script/add_new_user.sh`
- Adds a new user to WireGuard with automatic key generation
- Creates client configuration files
- Updates server configuration
- Manages WireGuard interface restart

## API Endpoints

The application provides a REST API for programmatic access:

- `GET /api/users` - Get all users
- `POST /api/users` - Add a new user (requires email)
- `PATCH /api/users/:publicKey` - Enable/disable a user

- `GET /api/users/:username/config` - Download client configuration file
- `GET /api/users/:username/config/content` - Get client configuration content
- `GET /api/config` - Get raw configuration
- `POST /api/config` - Update raw configuration

## Security Considerations

1. **File Permissions**: Ensure proper permissions on the WireGuard configuration file
2. **Network Access**: Consider restricting access to the web interface
3. **HTTPS**: Use a reverse proxy with SSL/TLS for production deployments
4. **Authentication**: Add authentication middleware for production use

## Production Deployment

For production deployment, consider:

1. **Process Manager**: Use PM2 or systemd to manage the Node.js process
2. **Reverse Proxy**: Use nginx or Apache as a reverse proxy
3. **SSL/TLS**: Implement HTTPS encryption
4. **Authentication**: Add user authentication
5. **Firewall**: Restrict access to authorized users only

### Example systemd service

Create `/etc/systemd/system/wireguard-controller.service`:

```ini
[Unit]
Description=NARADA
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/wireguard-controller
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable wireguard-controller
sudo systemctl start wireguard-controller
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the application has read/write access to the WireGuard config file
2. **Port Already in Use**: Change the port in `server.js` if port 3000 is occupied
3. **Config Not Found**: Verify the WireGuard configuration file exists at `/etc/wireguard/wg0.conf`

### Logs

Check the application logs for detailed error information:
```bash
# If using systemd
sudo journalctl -u wireguard-controller -f

# If running directly
node server.js
```

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve NARADA.

## License

This project is licensed under the MIT License.