class WireGuardController {
    constructor() {
        console.log('WireGuardController constructor called');
        this.users = [];
        this.filteredUsers = [];
        this.configPath = 'wg0.conf';
        this.authToken = localStorage.getItem('authToken');
        console.log('Auth token:', this.authToken ? 'Present' : 'Missing');
        this.isVerifying = false;
        this.sortBy = 'connection'; // Default sort by connection status
        this.sortOrder = 'desc'; // desc = connected first, asc = disconnected first
        this.selectedUsers = new Set(); // Track selected users
        this.searchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 2; // Reduced for testing pagination
        this.autoRefreshInterval = null;
        this.isLoading = false;
        this.init();
    }

    async init() {
        console.log('Starting init() function');

        // Check authentication first
        if (!this.authToken || !(await this.verifyToken())) {
            console.log('Authentication failed, redirecting to login');
            this.redirectToLogin();
            return;
        }

        console.log('Authentication successful, proceeding with initialization');

        // Show loading state initially
        this.showLoader();

        try {
            console.log('Loading branding...');
            await this.loadBranding();

            console.log('Loading users with status...');
            await this.loadUsersWithStatus();

            console.log('Updating stats...');
            this.updateStats();

            console.log('Rendering users...');
            this.renderUsers();

            console.log('Starting auto refresh...');
            this.startAutoRefresh();

            console.log('Initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
            this.hideLoader();
        }
    }

    showLoader() {
        this.isLoading = true;
        const loader = document.getElementById('tableLoader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    startAutoRefresh() {
        // Auto-refresh status every 15 seconds
        this.autoRefreshInterval = setInterval(async () => {
            if (!this.isLoading) {
                this.showRefreshIndicator();
                await this.loadUsersWithStatus();
                this.updateStats();
                this.renderUsers();
            }
        }, 15000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    showRefreshIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'refresh-indicator';
        indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Auto-refreshing...';
        document.body.appendChild(indicator);

        setTimeout(() => {
            if (document.body.contains(indicator)) {
                document.body.removeChild(indicator);
            }
        }, 2000);
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

                    // Handle logo load error
                    logo.onerror = function () {
                        this.style.display = 'none';
                        icon.style.display = 'block';
                    };
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

    showLoader() {
        this.isLoading = true;
        const loader = document.getElementById('tableLoader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoader() {
        this.isLoading = false;
        const loader = document.getElementById('tableLoader');
        if (loader) {
            loader.style.display = 'none';
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
        console.log('loadUsersWithStatus() called');
        try {
            const response = await fetch('/api/users/status', {
                headers: this.getAuthHeaders()
            });

            console.log('API response status:', response.status);

            if (await this.handleAuthError(response)) return;

            const data = await response.json();
            console.log('API response data:', data);

            if (data.success) {
                this.users = data.users;
                this.summary = data.summary;
                console.log('Users loaded:', this.users.length);
                this.applyFilters();
                console.log('Filtered users:', this.filteredUsers.length);
                this.hideLoader();
            } else {
                throw new Error(data.error || 'Failed to load user status');
            }
        } catch (error) {
            console.error('Error loading user status:', error);
            this.showNotification('Error loading user status', 'error');
            this.hideLoader();
        }
    }

    applyFilters() {
        let filtered = [...this.users];

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                (user.name || '').toLowerCase().includes(query) ||
                (user.email || '').toLowerCase().includes(query) ||
                (user.allowedIPs || '').toLowerCase().includes(query)
            );
        }

        this.filteredUsers = filtered;
        this.currentPage = 1; // Reset to first page when filters change
    }

    handleSearch(query) {
        this.searchQuery = query;
        this.applyFilters();
        this.renderUsers();
    }

    async manualRefresh() {
        this.showLoader();
        await this.loadUsersWithStatus();
        this.updateStats();
        this.renderUsers();
        this.hideLoader();
        this.showNotification('Data refreshed successfully', 'success');
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
        console.log('renderUsers() called');
        const usersContainer = document.getElementById('usersContainer');
        if (!usersContainer) {
            console.error('usersContainer element not found!');
            return;
        }

        console.log('Filtered users to render:', this.filteredUsers.length);

        if (this.filteredUsers.length === 0) {
            const isEmpty = this.users.length === 0;
            const message = isEmpty ?
                { icon: 'fas fa-users', title: 'No clients', text: 'Add your first WireGuard client to get started' } :
                { icon: 'fas fa-search', title: 'No matching clients', text: 'Try adjusting your search criteria' };

            usersContainer.innerHTML = `
                <div class="table-container-wrapper">
                    <div class="empty-state">
                        <i class="${message.icon}"></i>
                        <h3>${message.title}</h3>
                        <p>${message.text}</p>
                    </div>
                </div>
                
                <!-- Pagination -->
                <div class="pagination-container" id="paginationContainer" style="display: none;">
                    <div class="pagination-info" id="paginationInfo">
                        Showing 1-10 of 25 users
                    </div>
                    <div class="pagination" id="pagination">
                        <!-- Pagination buttons will be generated here -->
                    </div>
                </div>
            `;
            return;
        }

        // Sort users before rendering
        this.sortUsers();

        // Calculate pagination
        const totalItems = this.filteredUsers.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, totalItems);
        const paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);

        // Ensure table structure exists
        usersContainer.innerHTML = `
            <div class="table-container-wrapper">
                <div class="users-table-container">
                    <table class="users-table" id="usersTable">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" id="selectAll" onchange="controller.toggleSelectAll(this.checked)" title="Select All">
                                </th>
                                <th class="sortable" data-sort="name" onclick="controller.setSortBy('name')">
                                    User
                                </th>
                                <th class="sortable" data-sort="status" onclick="controller.setSortBy('status')">
                                    Status
                                </th>
                                <th class="sortable" data-sort="connection" onclick="controller.setSortBy('connection')">
                                    Connection
                                </th>
                                <th>IP Address</th>
                                <th class="sortable" data-sort="usage" onclick="controller.setSortBy('usage')">
                                    Usage
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                        </tbody>
                    </table>
                </div>
                <div id="tableLoader" class="loader-overlay" style="display: none;">
                    <div class="loader"></div>
                </div>
            </div>

            <!-- Pagination -->
            <div class="pagination-container" id="paginationContainer" style="display: none;">
                <div class="pagination-info" id="paginationInfo">
                    Showing 1-10 of 25 users
                </div>
                <div class="pagination" id="pagination">
                    <!-- Pagination buttons will be generated here -->
                </div>
            </div>
        `;

        // Render table body
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = paginatedUsers.map(user => `
            <tr class="${!user.enabled ? 'disabled' : ''} ${user.connectionStatus?.isConnected ? 'connected' : ''} ${this.selectedUsers.has(user.publicKey) ? 'selected' : ''}" data-user-key="${user.publicKey}">
                <td>
                    <input type="checkbox" class="user-checkbox" 
                           ${this.selectedUsers.has(user.publicKey) ? 'checked' : ''} 
                           onchange="controller.toggleUserSelection('${user.publicKey}', this.checked)">
                </td>
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

        // Update pagination
        this.renderPagination(totalItems, totalPages, startIndex, endIndex);

        // Update sort indicators after rendering
        this.updateSortIndicators();

        // Update bulk actions and select all checkbox
        this.updateBulkActionsVisibility();
        this.updateSelectAllCheckbox();
    }

    renderPagination(totalItems, totalPages, startIndex, endIndex) {
        console.log('renderPagination called with:', { totalItems, totalPages, startIndex, endIndex });

        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        const pagination = document.getElementById('pagination');

        if (!paginationContainer || !paginationInfo || !pagination) {
            console.log('Pagination elements not found in DOM');
            return;
        }

        // Always show pagination info, but hide navigation buttons if only 1 page
        paginationContainer.style.display = 'flex';
        paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} users`;

        if (totalPages <= 1) {
            console.log('Only 1 page, hiding navigation buttons');
            pagination.innerHTML = ''; // Hide navigation buttons but keep info
            return;
        }

        paginationContainer.style.display = 'flex';
        paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} users`;

        // Generate pagination buttons
        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="controller.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="controller.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span style="padding: 8px;">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="controller.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span style="padding: 8px;">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="controller.goToPage(${totalPages})">${totalPages}</button>`;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="controller.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderUsers();
    }

    showClients() {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.nav-item')[0].classList.add('active');

        // Show clients view, hide administrator view
        document.getElementById('clientsView').style.display = 'block';
        document.getElementById('administratorView').style.display = 'none';
    }

    async showAdministrator() {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.nav-item')[1].classList.add('active');

        // Show administrator view, hide clients view
        document.getElementById('clientsView').style.display = 'none';
        document.getElementById('administratorView').style.display = 'block';

        // Load current settings
        await this.loadAdministratorSettings();
    }

    async loadAdministratorSettings() {
        const projectName = document.title || 'NARADA';
        document.getElementById('adminProjectName').value = projectName;

        // Load logo URL from server
        try {
            const response = await fetch('/api/config/branding');
            const data = await response.json();
            if (data.success && data.logoUrl) {
                document.getElementById('adminLogoUrl').value = data.logoUrl;
            } else {
                document.getElementById('adminLogoUrl').value = '';
            }
        } catch (error) {
            console.log('Could not load branding settings');
            document.getElementById('adminLogoUrl').value = '';
        }
    }

    truncateKey(key) {
        if (!key) return 'N/A';
        // Always mask the public key for security
        return '••••••••••••••••••••';
    }

    sortUsers() {
        this.filteredUsers.sort((a, b) => {
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
            this.showLoader();

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
                    this.applyFilters();
                    this.updateStats();
                    this.renderUsers();
                    this.showNotification(data.message, 'success');

                    // Wait a bit for WireGuard to restart, then refresh status
                    setTimeout(async () => {
                        await this.loadUsersWithStatus();
                        this.updateStats();
                        this.renderUsers();
                    }, 3000);
                }
            } else {
                throw new Error(data.error || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error toggling user:', error);
            this.showNotification('Error updating user status', 'error');
        } finally {
            this.hideLoader();
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
            this.showLoader();
            await this.loadUsersWithStatus();
            this.updateStats();
            this.renderUsers();
            this.showNotification('Configuration reloaded successfully', 'success');
        } catch (error) {
            console.error('Error reloading config:', error);
            this.showNotification('Error reloading configuration', 'error');
        } finally {
            this.hideLoader();
        }
    }

    toggleUserSelection(publicKey, isSelected) {
        if (isSelected) {
            this.selectedUsers.add(publicKey);
        } else {
            this.selectedUsers.delete(publicKey);
        }

        this.updateBulkActionsVisibility();
        this.updateSelectAllCheckbox();
        this.updateRowSelection(publicKey, isSelected);
    }

    toggleSelectAll(selectAll) {
        this.selectedUsers.clear();

        if (selectAll) {
            // Only select users that are currently visible (filtered)
            this.filteredUsers.forEach(user => {
                this.selectedUsers.add(user.publicKey);
            });
        }

        this.renderUsers();
        this.updateBulkActionsVisibility();
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            const visibleUsers = this.filteredUsers.length;
            const selectedVisibleCount = this.filteredUsers.filter(user =>
                this.selectedUsers.has(user.publicKey)
            ).length;

            selectAllCheckbox.checked = selectedVisibleCount === visibleUsers && visibleUsers > 0;
            selectAllCheckbox.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleUsers;
        }
    }

    updateRowSelection(publicKey, isSelected) {
        const row = document.querySelector(`tr[data-user-key="${publicKey}"]`);
        if (row) {
            if (isSelected) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        }
    }

    updateBulkActionsVisibility() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = this.selectedUsers.size;

        if (selectedCount > 0) {
            bulkActions.style.display = 'flex';
            const countElement = bulkActions.querySelector('.selected-count');
            countElement.textContent = `${selectedCount} user${selectedCount === 1 ? '' : 's'} selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    clearSelection() {
        this.selectedUsers.clear();
        this.renderUsers();
        this.updateBulkActionsVisibility();
    }

    async bulkToggleUsers(enable) {
        if (this.selectedUsers.size === 0) {
            this.showNotification('No users selected', 'warning');
            return;
        }

        const action = enable ? 'enable' : 'disable';
        const selectedUserNames = this.users
            .filter(user => this.selectedUsers.has(user.publicKey))
            .map(user => user.name || 'Unnamed User');

        if (!confirm(`Are you sure you want to ${action} ${this.selectedUsers.size} user(s)?\n\nUsers: ${selectedUserNames.join(', ')}`)) {
            return;
        }

        try {
            this.showLoader();
            const selectedKeys = Array.from(this.selectedUsers);

            // Show progress notification
            this.showNotification(`${action === 'enable' ? 'Enabling' : 'Disabling'} ${selectedKeys.length} users...`, 'info');

            const response = await fetch('/api/users/bulk', {
                method: 'PATCH',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    publicKeys: selectedKeys,
                    enabled: enable
                })
            });

            if (await this.handleAuthError(response)) return;

            const data = await response.json();

            if (data.success) {
                // Clear selection and refresh
                this.clearSelection();
                await this.loadUsersWithStatus();
                this.updateStats();
                this.renderUsers();

                // Show result notification
                let message = data.message;
                if (data.notFoundKeys && data.notFoundKeys.length > 0) {
                    message += ` (${data.notFoundKeys.length} user(s) not found)`;
                }

                this.showNotification(message, data.warning ? 'warning' : 'success');

                // Wait a bit for WireGuard to restart, then refresh status
                setTimeout(async () => {
                    await this.loadUsersWithStatus();
                    this.updateStats();
                    this.renderUsers();
                }, 3000);
            } else {
                throw new Error(data.error || 'Failed to bulk update users');
            }
        } catch (error) {
            console.error('Error bulk toggling users:', error);
            this.showNotification('Error updating users', 'error');
        } finally {
            this.hideLoader();
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
    controller.manualRefresh();
}

// Administrator form submission
document.addEventListener('DOMContentLoaded', function () {
    const projectSettingsForm = document.getElementById('projectSettingsForm');
    if (projectSettingsForm) {
        projectSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const projectName = document.getElementById('adminProjectName').value.trim();
            const logoUrl = document.getElementById('adminLogoUrl').value.trim();

            // Update page title
            if (projectName) {
                document.title = projectName;
            }

            // Update logo
            const headerLogo = document.getElementById('headerLogo');
            const headerIcon = document.getElementById('headerIcon');

            if (logoUrl) {
                headerLogo.src = logoUrl;
                headerLogo.style.display = 'block';
                headerIcon.style.display = 'none';
                headerLogo.onerror = function () {
                    this.style.display = 'none';
                    headerIcon.style.display = 'block';
                };
            } else {
                headerLogo.style.display = 'none';
                headerIcon.style.display = 'block';
            }

            controller.showNotification('Settings saved successfully', 'success');
        });
    }
});

// Initialize the controller when DOM is ready
let controller;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        controller = new WireGuardController();
    });
} else {
    controller = new WireGuardController();
}