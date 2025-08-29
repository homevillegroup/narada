class WireGuardController {
    constructor() {
        this.users = [];
        this.configPath = 'wg0.conf';
        this.authToken = localStorage.getItem('authToken');
        this.isVerifying = false;
        this.sortBy = 'connection'; // Default sort by connection status
        this.sortOrder = 'desc'; // desc = connected first, asc = disconnected first
        this.init();
    }

    async init() {
        // Check authentication first
        if (!this.authToken || !(await this.verifyToken())) {
            this.redirectToLogin();
            return;
        }
        
        await this.loadBranding();
        await this.loadUsersWithStatus();
        this.updateStats();
        this.renderUsers();
        this.addLogoutButton();
        
        // Auto-refresh status every 30 seconds
        setInterval(() => {
            this.loadUsersWithStatus().then(() => {
                this.updateStats();
                this.renderUsers();
            });
        }, 30000);
    }

    async loadBranding() {
        try {
            const response = await fetch('/api/config/branding');
            const data = await response.json();
            if (data.success && data.logoUrl) {
                const logo = document.getElementById('headerLogo');
                const icon = document.getElementById('headerIcon');
                if (logo && icon) {
                    logo.src = data.logoUrl;
                    logo.style.display = 'block';
                    icon.style.display = 'none';
                }
            }
        } catch (error) {
            console.log('Could not load branding, using default icon');
        }
    }

    async verifyToken() {
        if (this.isVerifying) {
            return false;
        }
        
        this.isVerifying = true;
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        } finally {
            this.isVerifying = false;
        }
    }

    redirectToLogin() {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    }

    addLogoutButton() {
        // Add logout button to the header
        const header = document.querySelector('.header');
        if (header && !document.getElementById('logoutBtn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = 'btn btn-secondary';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            logoutBtn.style.marginLeft = 'auto';
            logoutBtn.onclick = () => this.logout();
            header.appendChild(logoutBtn);
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
        };
    }

    async handleAuthError(response) {
        if (response.status === 401 || response.status === 403) {
            this.redirectToLogin();
            return true;
        }
        return false;
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: this.getAuthHeaders()
            });

            if (await this.handleAuthError(response)) return;

            const data = await response.json();

            if (data.success) {
                this.users = data.users;
            } else {
                throw new Error(data.error || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Error loading configuration', 'error');
        }
    }

    async loadUsersWithStatus() {
        try {
            const response = await fetch('/api/users/status', {
                headers: this.getAuthHeaders()
            });

            if (await this.handleAuthError(response)) return;

            const data = await response.json();

            if (data.success) {
                this.users = data.users;
                this.summary = data.summary;
            } else {
                throw new Error(data.error || 'Failed to load user status');
            }
        } catch (error) {
            console.error('Error loading user status:', error);
            this.showNotification('Error loading user status', 'error');
        }
    }



    updateStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.enabled).length;
        const disabledUsers = totalUsers - activeUsers;
        const connectedUsers = this.users.filter(user => user.connectionStatus?.isConnected).length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('disabledUsers').textContent = disabledUsers;
        
        // Update connected users if element exists
        const connectedElement = document.getElementById('connectedUsers');
        if (connectedElement) {
            connectedElement.textContent = connectedUsers;
        }
    }

    renderUsers() {
        const usersTableBody = document.getElementById('usersTableBody');
        const usersContainer = document.getElementById('usersContainer');

        if (this.users.length === 0) {
            usersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No users found</h3>
                    <p>Add your first WireGuard user to get started</p>
                </div>
            `;
            return;
        }

        // Sort users before rendering
        this.sortUsers();

        // Show table if hidden
        if (usersContainer.innerHTML.includes('empty-state')) {
            usersContainer.innerHTML = `
                <div class="users-table-container">
                    <table class="users-table" id="usersTable">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Status</th>
                                <th>IP Address</th>
                                <th>Public Key</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                        </tbody>
                    </table>
                </div>
            `;
        }

        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = this.users.map(user => `
            <tr class="${!user.enabled ? 'disabled' : ''} ${user.connectionStatus?.isConnected ? 'connected' : ''}">
                <td>
                    <div class="user-name">${user.name || 'Unnamed User'}</div>
                    ${user.email ? `<div class="user-email">${user.email}</div>` : ''}
                </td>
                <td>
                    <span class="user-status ${user.enabled ? 'status-active' : 'status-disabled'}">
                        ${user.enabled ? 'Active' : 'Disabled'}
                    </span>
                </td>
                <td>
                    <div class="connection-status">
                        <span class="connection-indicator ${user.connectionStatus?.isConnected ? 'connected' : 'disconnected'}">
                            <i class="fas fa-circle"></i>
                            ${user.connectionStatus?.isConnected ? 'Connected' : 'Offline'}
                        </span>
                        ${user.connectionStatus?.isConnected && user.connectionStatus?.latestHandshake ? 
                            `<div class="handshake-time">${user.connectionStatus.latestHandshake}</div>` : ''}
                    </div>
                </td>
                <td>
                    <span class="user-ip">${user.allowedIPs}</span>
                    ${user.connectionStatus?.endpoint ? 
                        `<div class="endpoint">${user.connectionStatus.endpoint}</div>` : ''}
                </td>
                <td>
                    <div class="usage-stats">
                        <div class="usage-item">
                            <i class="fas fa-arrow-down"></i> ${user.connectionStatus?.transferReceived || '0 B'}
                        </div>
                        <div class="usage-item">
                            <i class="fas fa-arrow-up"></i> ${user.connectionStatus?.transferSent || '0 B'}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="user-actions">
                        <button class="btn btn-primary btn-table" onclick="controller.confirmDownloadConfig('${user.name}')" title="Download Config">
                            <i class="fas fa-download"></i>
                        </button>
                        ${user.enabled ?
                `<button class="btn btn-warning btn-table" onclick="controller.confirmToggleUser('${user.publicKey}', false, '${user.name}')" title="Disable User">
                                <i class="fas fa-pause"></i>
                            </button>` :
                `<button class="btn btn-success btn-table" onclick="controller.confirmToggleUser('${user.publicKey}', true, '${user.name}')" title="Enable User">
                                <i class="fas fa-play"></i>
                            </button>`
            }
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Update sort indicators after rendering
        this.updateSortIndicators();
    }

    truncateKey(key) {
        if (!key) return 'N/A';
        // Always mask the public key for security
        return '••••••••••••••••••••';
    }

    sortUsers() {
        this.users.sort((a, b) => {
            switch (this.sortBy) {
                case 'connection':
                    const aConnected = a.connectionStatus?.isConnected ? 1 : 0;
                    const bConnected = b.connectionStatus?.isConnected ? 1 : 0;
                    if (this.sortOrder === 'desc') {
                        return bConnected - aConnected;
                    } else {
                        return aConnected - bConnected;
                    }
                
                case 'usage':
                    const aUsage = this.parseDataSize(a.connectionStatus?.transferReceived || '0 B') + 
                                  this.parseDataSize(a.connectionStatus?.transferSent || '0 B');
                    const bUsage = this.parseDataSize(b.connectionStatus?.transferReceived || '0 B') + 
                                  this.parseDataSize(b.connectionStatus?.transferSent || '0 B');
                    if (this.sortOrder === 'desc') {
                        return bUsage - aUsage;
                    } else {
                        return aUsage - bUsage;
                    }
                
                case 'status':
                    const aStatus = a.enabled ? 1 : 0;
                    const bStatus = b.enabled ? 1 : 0;
                    if (this.sortOrder === 'desc') {
                        return bStatus - aStatus;
                    } else {
                        return aStatus - bStatus;
                    }
                
                case 'name':
                    const aName = (a.name || '').toLowerCase();
                    const bName = (b.name || '').toLowerCase();
                    if (this.sortOrder === 'desc') {
                        return bName.localeCompare(aName);
                    } else {
                        return aName.localeCompare(bName);
                    }
                
                default:
                    return 0;
            }
        });
    }

    parseDataSize(sizeStr) {
        if (!sizeStr || sizeStr === '0 B') return 0;
        
        const units = {
            'B': 1,
            'KiB': 1024,
            'MiB': 1024 * 1024,
            'GiB': 1024 * 1024 * 1024,
            'KB': 1000,
            'MB': 1000 * 1000,
            'GB': 1000 * 1000 * 1000
        };
        
        const match = sizeStr.match(/^([\d.]+)\s*(\w+)$/);
        if (!match) return 0;
        
        const value = parseFloat(match[1]);
        const unit = match[2];
        
        return value * (units[unit] || 1);
    }

    setSortBy(sortBy) {
        if (this.sortBy === sortBy) {
            // Toggle sort order if same column
            this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
        } else {
            // Set new sort column with default order
            this.sortBy = sortBy;
            this.sortOrder = sortBy === 'connection' || sortBy === 'usage' || sortBy === 'status' ? 'desc' : 'asc';
        }
        
        this.sortUsers();
        this.renderUsers();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        // Remove all existing sort indicators
        document.querySelectorAll('.sort-indicator').forEach(el => el.remove());
        
        // Add indicator to current sort column
        const currentHeader = document.querySelector(`[data-sort="${this.sortBy}"]`);
        if (currentHeader) {
            const indicator = document.createElement('i');
            indicator.className = `fas fa-chevron-${this.sortOrder === 'desc' ? 'down' : 'up'} sort-indicator`;
            indicator.style.marginLeft = '5px';
            indicator.style.fontSize = '0.7rem';
            currentHeader.appendChild(indicator);
        }
    }

    async toggleUser(publicKey, enable) {
        try {
            const response = await fetch(`/api/users/${encodeURIComponent(publicKey)}`, {
                method: 'PATCH',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ enabled: enable })
            });

            if (await this.handleAuthError(response)) return;

            const data = await response.json();

            if (data.success) {
                const user = this.users.find(u => u.publicKey === publicKey);
                if (user) {
                    user.enabled = enable;
                    this.updateStats();
                    this.renderUsers();
                    this.showNotification(data.message, 'success');
                }
            } else {
                throw new Error(data.error || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error toggling user:', error);
            this.showNotification('Error updating user status', 'error');
        }
    }



    async addUser(email) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ email })
            });

            if (await this.handleAuthError(response)) return false;

            const data = await response.json();

            if (data.success) {
                // Reload users to get the updated list
                await this.loadUsersWithStatus();
                this.updateStats();
                this.renderUsers();
                
                this.showNotification(data.message, 'success');
                
                // Show config download option
                this.showConfigModal(data.user, data.clientConfig);
                return true;
            } else {
                this.showNotification(data.error, 'error');
                return false;
            }
        } catch (error) {
            console.error('Error adding user:', error);
            this.showNotification('Error adding user', 'error');
            return false;
        }
    }

    confirmDownloadConfig(username) {
        if (confirm(`Are you sure you want to download the configuration file for ${username}?`)) {
            this.downloadConfig(username);
        }
    }

    confirmToggleUser(publicKey, enable, username) {
        const action = enable ? 'enable' : 'disable';
        if (confirm(`Are you sure you want to ${action} the user ${username}?`)) {
            this.toggleUser(publicKey, enable);
        }
    }

    async downloadConfig(username) {
        try {
            const response = await fetch(`/api/users/${username}/config`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (await this.handleAuthError(response)) return;
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${username}.conf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showNotification('Configuration downloaded successfully', 'success');
            } else {
                throw new Error('Failed to download configuration');
            }
        } catch (error) {
            console.error('Error downloading config:', error);
            this.showNotification('Error downloading configuration', 'error');
        }
    }

    showConfigModal(user, clientConfig) {
        // Create a modal to show the configuration
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">User Added Successfully</h2>
                    <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                </div>
                <div style="margin-bottom: 20px;">
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>IP Address:</strong> ${user.ip}</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Client Configuration:</label>
                    <textarea class="form-input" readonly style="height: 200px; font-family: monospace; font-size: 12px;">${clientConfig}</textarea>
                </div>
                <div class="form-group">
                    <button class="btn btn-primary" onclick="controller.downloadConfig('${user.username}')" style="width: 100%;">
                        <i class="fas fa-download"></i> Download Configuration File
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }



    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;

        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);

        // Add CSS animations if not already added
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    async reloadConfig() {
        try {
            await this.loadUsersWithStatus();
            this.updateStats();
            this.renderUsers();
            this.showNotification('Configuration reloaded successfully', 'success');
        } catch (error) {
            console.error('Error reloading config:', error);
            this.showNotification('Error reloading configuration', 'error');
        }
    }
}

// Modal functions
function openAddUserModal() {
    document.getElementById('addUserModal').style.display = 'block';
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
    document.getElementById('addUserForm').reset();
}

// Form submission
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('userEmail').value.trim();
    
    if (confirm(`Are you sure you want to add a new user with email: ${email}?`)) {
        if (await controller.addUser(email)) {
            closeAddUserModal();
        }
    }
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('addUserModal');
    if (e.target === modal) {
        closeAddUserModal();
    }
});

// Global reload function
function reloadConfig() {
    controller.reloadConfig();
}

// Initialize the controller
const controller = new WireGuardController();