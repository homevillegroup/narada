require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = process.env.WG_CONFIG_PATH || '/etc/wireguard/wg0.conf';

// Authentication configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wireguard123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Branding configuration
const LOGO_URL = process.env.LOGO_URL || 'https://cdn.homevillegroup.com/logo/hvg_horizontal.svg';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Serve static files (login page doesn't need auth)
app.use(express.static('.', {
    index: false // Don't serve index.html by default
}));

// Helper functions
async function cleanupOldBackups() {
    try {
        const backupDir = path.join(__dirname, 'backup');
        const files = await fs.readdir(backupDir);
        const backupFiles = files
            .filter(file => file.startsWith('wg0.conf.backup.'))
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                stat: null
            }));

        // Get file stats for sorting by creation time
        for (const file of backupFiles) {
            try {
                file.stat = await fs.stat(file.path);
            } catch (error) {
                console.warn('Could not stat backup file:', file.name);
            }
        }

        // Sort by creation time (newest first) and keep only the last 10
        const sortedFiles = backupFiles
            .filter(file => file.stat)
            .sort((a, b) => b.stat.mtime - a.stat.mtime);

        if (sortedFiles.length > 10) {
            const filesToDelete = sortedFiles.slice(10);
            for (const file of filesToDelete) {
                try {
                    await fs.unlink(file.path);
                } catch (error) {
                    console.warn('Could not delete old backup:', file.name, error.message);
                }
            }
        }
    } catch (error) {
        console.warn('Could not cleanup old backups:', error.message);
    }
}

async function getLastUsedIP() {
    try {
        const scriptPath = path.join(__dirname, 'script/find_last_used_ip.sh');
        const { stdout } = await execAsync(`bash ${scriptPath} ${CONFIG_PATH}`);
        const lastIP = stdout.trim().replace('Last assigned IP address: ', '');
        return lastIP || '10.0.0.1';
    } catch (error) {
        console.error('Error getting last used IP:', error);
        return '10.0.0.1';
    }
}

function getNextIP(lastIP) {
    const parts = lastIP.split('.');
    const lastOctet = parseInt(parts[3]) + 1;
    return `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet}`;
}

async function addNewUserWithScript(username, ip) {
    try {
        const scriptPath = path.join(__dirname, 'script/add_new_user.sh');
        
        // Make sure script is executable
        await execAsync(`chmod +x ${scriptPath}`);
        
        const { stdout, stderr } = await execAsync(`bash ${scriptPath} ${username} ${ip} ${CONFIG_PATH}`);
        
        // Check if script execution was successful
        if (stdout.includes('Error:') || stderr.includes('Error:')) {
            throw new Error(`Script execution failed: ${stdout} ${stderr}`);
        }
        
        // The script should output the client config path
        const clientConfigPath = `/etc/wireguard/clients/${username}/${username}.conf`;
        
        // Verify the client config was created
        try {
            await fs.access(clientConfigPath);
        } catch (error) {
            throw new Error('Client configuration file was not created');
        }
        
        return clientConfigPath;
    } catch (error) {
        console.error('Error executing add_new_user script:', error);
        throw new Error(`Failed to add user: ${error.message}`);
    }
}

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Check credentials
        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { username: username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token: token,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        message: 'Token is valid'
    });
});

// Get branding configuration (public endpoint)
app.get('/api/config/branding', (req, res) => {
    res.json({
        success: true,
        logoUrl: LOGO_URL
    });
});

app.post('/api/auth/logout', (req, res) => {
    // Since we're using JWT, logout is handled client-side by removing the token
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});



// Serve the main page (protected)
app.get('/', (req, res) => {
    // For the main page, we'll let the frontend handle authentication
    // The frontend will redirect to login if no valid token exists
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Get current configuration
app.get('/api/config', authenticateToken, async (req, res) => {
    try {
        const configContent = await fs.readFile(CONFIG_PATH, 'utf8');
        
        // Mask public keys and private keys in the config for security
        const maskedConfig = configContent
            .replace(/PublicKey\s*=\s*[A-Za-z0-9+/=]+/g, 'PublicKey = ••••••••••••••••••••')
            .replace(/PrivateKey\s*=\s*[A-Za-z0-9+/=]+/g, 'PrivateKey = ••••••••••••••••••••');
        
        res.json({ success: true, config: maskedConfig });
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to read configuration file',
            details: error.message 
        });
    }
});

// Update configuration
app.post('/api/config', authenticateToken, async (req, res) => {
    try {
        const { config } = req.body;
        
        if (!config) {
            return res.status(400).json({ 
                success: false, 
                error: 'Configuration content is required' 
            });
        }

        // Create backup before updating
        const backupDir = path.join(__dirname, 'backup');
        try {
            await fs.mkdir(backupDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create backup directory:', error.message);
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `wg0.conf.backup.${timestamp}`);
        try {
            const currentConfig = await fs.readFile(CONFIG_PATH, 'utf8');
            await fs.writeFile(backupPath, currentConfig);
            await cleanupOldBackups();
        } catch (backupError) {
            console.warn('Could not create backup:', backupError.message);
        }

        // Write new configuration
        await fs.writeFile(CONFIG_PATH, config);
        
        // Restart WireGuard service (optional - uncomment if needed)
        // const { exec } = require('child_process');
        // exec('systemctl restart wg-quick@wg0', (error) => {
        //     if (error) console.warn('Failed to restart WireGuard:', error.message);
        // });

        res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update configuration file',
            details: error.message 
        });
    }
});

// Parse users from configuration
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const configContent = await fs.readFile(CONFIG_PATH, 'utf8');
        
        const users = parseUsersFromConfig(configContent);
        
        // Validate users have required fields
        const validUsers = users.filter(user => {
            const isValid = user.name && user.allowedIPs;
            if (!isValid) {
                console.warn('Invalid user found:', user);
            }
            return isValid;
        });
        res.json({ success: true, users: validUsers });
    } catch (error) {
        console.error('Error parsing users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to parse users from configuration',
            details: error.message 
        });
    }
});

// Add a new user with email
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
        }

        // Extract username from email
        const username = email.split('@')[0];

        // Check if user already exists
        const configContent = await fs.readFile(CONFIG_PATH, 'utf8');
        const users = parseUsersFromConfig(configContent);
        
        if (users.some(user => user.name === username || user.email === email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'User with this email or username already exists' 
            });
        }

        // Find last used IP
        const lastIP = await getLastUsedIP();
        const nextIP = getNextIP(lastIP);

        // Double-check IP is not in use
        if (users.some(user => user.allowedIPs.includes(nextIP))) {
            return res.status(400).json({ 
                success: false, 
                error: 'Generated IP address is already in use' 
            });
        }

        // Add new user using script
        const clientConfigPath = await addNewUserWithScript(username, nextIP);

        // Wait a moment for the file to be written and WireGuard to be reloaded
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Read the generated client config
        let clientConfig;
        try {
            clientConfig = await fs.readFile(clientConfigPath, 'utf8');
        } catch (error) {
            console.error('Error reading client config:', error);
            clientConfig = 'Configuration file not found. Please check the server logs.';
        }

        res.json({ 
            success: true, 
            message: 'User added successfully',
            user: {
                username,
                email,
                ip: nextIP,
                configPath: clientConfigPath
            },
            clientConfig
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add user',
            details: error.message 
        });
    }
});

// Toggle user status (enable/disable)
app.patch('/api/users/:publicKey', authenticateToken, async (req, res) => {
    try {
        const { publicKey } = req.params;
        const { enabled } = req.body;
        
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ 
                success: false, 
                error: 'enabled field must be a boolean' 
            });
        }

        const configContent = await fs.readFile(CONFIG_PATH, 'utf8');
        const users = parseUsersFromConfig(configContent);
        
        const user = users.find(u => u.publicKey === publicKey);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        user.enabled = enabled;
        
        // Generate new config
        const newConfig = generateConfig(configContent, users);
        
        // Create backup and write new config
        const backupDir = path.join(__dirname, 'backup');
        try {
            await fs.mkdir(backupDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create backup directory:', error.message);
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `wg0.conf.backup.${timestamp}`);
        await fs.writeFile(backupPath, configContent);
        await cleanupOldBackups();
        await fs.writeFile(CONFIG_PATH, newConfig);

        // Reload WireGuard configuration
        try {
            await execAsync('sudo wg-quick down wg0');
            await execAsync('sudo wg-quick up wg0');
        } catch (reloadError) {
            console.warn('Failed to reload WireGuard configuration:', reloadError.message);
            return res.json({ 
                success: true, 
                message: `User ${enabled ? 'enabled' : 'disabled'} successfully, but WireGuard reload failed. Please reload manually.`,
                warning: 'WireGuard configuration not reloaded automatically'
            });
        }

        res.json({ 
            success: true, 
            message: `User ${enabled ? 'enabled' : 'disabled'} and WireGuard configuration reloaded successfully` 
        });
    } catch (error) {
        console.error('Error toggling user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to toggle user status',
            details: error.message 
        });
    }
});

// Download client configuration
app.get('/api/users/:username/config', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const clientConfigPath = `/etc/wireguard/clients/${username}/${username}.conf`;
        
        // Check if file exists
        try {
            await fs.access(clientConfigPath);
        } catch (error) {
            return res.status(404).json({ 
                success: false, 
                error: 'Client configuration not found' 
            });
        }

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${username}.conf"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        // Send file
        res.sendFile(clientConfigPath);
    } catch (error) {
        console.error('Error downloading config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to download configuration',
            details: error.message 
        });
    }
});

// Get client configuration content
app.get('/api/users/:username/config/content', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const clientConfigPath = `/etc/wireguard/clients/${username}/${username}.conf`;
        
        const configContent = await fs.readFile(clientConfigPath, 'utf8');
        res.json({ 
            success: true, 
            config: configContent,
            filename: `${username}.conf`
        });
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(404).json({ 
            success: false, 
            error: 'Client configuration not found',
            details: error.message 
        });
    }
});



// Helper function to parse users from config
function parseUsersFromConfig(configContent) {
    const users = [];
    const lines = configContent.split('\n');
    let currentPeer = null;
    let isEnabled = true;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if we're starting a new peer section
        if (line === '[Peer]' || line === '#[Peer]') {
            // Save previous peer if it has required data
            if (currentPeer && (currentPeer.publicKey || currentPeer.allowedIPs)) {
                users.push(currentPeer);
            }
            
            // Start new peer
            isEnabled = line === '[Peer]';
            currentPeer = {
                name: '',
                email: '',
                publicKey: '',
                allowedIPs: '',
                enabled: isEnabled
            };
            continue;
        }

        if (currentPeer) {
            // Extract user name and email from comment (look for lines that start with # but aren't field comments)
            if (line.startsWith('#') && !line.includes('=') && line.length > 1) {
                const nameInfo = line.substring(1).trim();
                
                // Check if it contains email in parentheses
                const emailMatch = nameInfo.match(/^(.+?)\s*\((.+@.+)\)$/);
                if (emailMatch) {
                    currentPeer.name = emailMatch[1].trim();
                    currentPeer.email = emailMatch[2].trim();
                } else if (nameInfo.includes('@')) {
                    // It's an email
                    currentPeer.email = nameInfo;
                    currentPeer.name = nameInfo.split('@')[0];
                } else {
                    // It's just a name
                    currentPeer.name = nameInfo;
                }
            }
            
            // Extract PublicKey (handle both enabled and disabled peers)
            if (line.includes('PublicKey')) {
                const keyMatch = line.match(/(?:#\s*)?PublicKey\s*=\s*(.+)$/);
                if (keyMatch) {
                    currentPeer.publicKey = keyMatch[1].trim();
                    // If the line starts with #, this field is disabled
                    if (line.startsWith('#')) {
                        currentPeer.enabled = false;
                    }
                }
            }
            
            // Extract AllowedIPs (handle both enabled and disabled peers)
            if (line.includes('AllowedIPs')) {
                const ipsMatch = line.match(/(?:#\s*)?AllowedIPs\s*=\s*(.+)$/);
                if (ipsMatch) {
                    currentPeer.allowedIPs = ipsMatch[1].trim();
                    // If the line starts with #, this field is disabled
                    if (line.startsWith('#')) {
                        currentPeer.enabled = false;
                    }
                }
            }
        }
    }

    // Add the last peer if exists and has required data
    if (currentPeer && (currentPeer.publicKey || currentPeer.allowedIPs)) {
        users.push(currentPeer);
    }

    return users;
}

// Helper function to generate config from users
function generateConfig(originalConfig, users) {
    // Extract the interface section
    const lines = originalConfig.split('\n');
    const interfaceLines = [];
    let inInterface = false;
    
    for (const line of lines) {
        if (line.trim() === '[Interface]') {
            inInterface = true;
        } else if (line.trim().startsWith('[Peer]') || line.trim().startsWith('#[Peer]')) {
            break;
        }
        
        if (inInterface) {
            interfaceLines.push(line);
        }
    }

    let config = interfaceLines.join('\n') + '\n\n';

    // Add users
    users.forEach(user => {
        if (user.enabled) {
            config += `[Peer]\n#${user.name}\nPublicKey = ${user.publicKey}\nAllowedIPs = ${user.allowedIPs}\n\n`;
        } else {
            config += `#[Peer]\n# ${user.name}\n#PublicKey = ${user.publicKey}\n#AllowedIPs = ${user.allowedIPs}\n\n`;
        }
    });

    return config;
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 NARADA server running on http://localhost:${PORT}`);
    console.log(`📁 Config file path: ${CONFIG_PATH}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check if config file exists
    fs.access(CONFIG_PATH)
        .then(() => console.log(`✅ Configuration file found and accessible`))
        .catch(() => console.log(`⚠️  Warning: Configuration file not found or not accessible`));
});

module.exports = app;