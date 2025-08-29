# Security Policy

## 🔒 Supported Versions

We actively support the following versions of NARADA with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## 🚨 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in NARADA, please follow these steps:

### 📧 Private Disclosure

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please email us at: **security@homevillegroup.com**

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (if you have them)

### 🕐 Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity (typically 14-30 days)

### 🏆 Security Hall of Fame

We recognize security researchers who help make NARADA safer:

<!-- Security contributors will be listed here -->

*Originally developed by Sachit Kumar (y-sachit) at Homeville Consulting Private Limited*

## 🛡️ Security Best Practices

### For Users

1. **Change Default Credentials**
   ```bash
   # Always change default admin credentials
   export ADMIN_USERNAME=your-secure-username
   export ADMIN_PASSWORD=your-very-secure-password
   ```

2. **Use Strong JWT Secrets**
   ```bash
   # Generate a strong JWT secret (minimum 32 characters)
   export JWT_SECRET=$(openssl rand -base64 32)
   ```

3. **Enable HTTPS**
   - Use a reverse proxy (nginx/Apache) with SSL certificates
   - Never run NARADA directly exposed to the internet without HTTPS

4. **Regular Updates**
   - Keep NARADA updated to the latest version
   - Monitor security advisories

5. **Network Security**
   - Use firewall rules to restrict access
   - Consider VPN-only access for the management interface
   - Regularly audit access logs

### For Developers

1. **Input Validation**
   - Always validate and sanitize user inputs
   - Use parameterized queries for database operations
   - Implement proper error handling

2. **Authentication & Authorization**
   - Use strong password hashing (bcrypt)
   - Implement proper session management
   - Follow principle of least privilege

3. **Secure Coding Practices**
   - Avoid hardcoded secrets
   - Use environment variables for configuration
   - Implement proper logging (without sensitive data)

## 🔍 Security Features

NARADA includes several built-in security features:

- **JWT-based Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password storage
- **Input Validation**: Server-side validation of all inputs
- **CORS Protection**: Configurable CORS policies
- **Rate Limiting**: Protection against brute force attacks (planned)
- **Audit Logging**: Comprehensive logging of user actions
- **Key Masking**: Sensitive data masked in UI and logs

## 🚫 Known Security Considerations

1. **File System Access**: NARADA requires read/write access to WireGuard configuration files
2. **Root Privileges**: May require elevated privileges for WireGuard operations
3. **Network Exposure**: Management interface should not be directly exposed to the internet

## 📋 Security Checklist

Before deploying NARADA in production:

- [ ] Changed default admin credentials
- [ ] Generated strong JWT secret
- [ ] Configured HTTPS with valid certificates
- [ ] Set up firewall rules
- [ ] Configured proper file permissions
- [ ] Enabled audit logging
- [ ] Set up monitoring and alerting
- [ ] Reviewed and customized security settings
- [ ] Tested backup and recovery procedures

## 🔄 Security Updates

Security updates are released as patch versions (e.g., 1.0.1, 1.0.2) and include:

- Security vulnerability fixes
- Dependency updates with security patches
- Security feature enhancements

Subscribe to our releases to stay informed about security updates.

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [WireGuard Security](https://www.wireguard.com/papers/wireguard.pdf)

## 🤝 Security Community

We believe in responsible disclosure and work closely with the security community to keep NARADA secure. If you're a security researcher, we welcome your contributions and feedback.

---

**Remember**: Security is a shared responsibility. While we work hard to make NARADA secure by default, proper deployment and configuration are crucial for maintaining security in your environment.

---

**NARADA** - Copyright (c) 2024 Homeville Consulting Private Limited  
Originally created by Sachit Kumar (y-sachit)