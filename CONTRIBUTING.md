# Contributing to NARADA

Thank you for your interest in contributing to NARADA! We welcome contributions from developers of all skill levels.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git
- Basic knowledge of JavaScript/Node.js
- Familiarity with WireGuard (helpful but not required)

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/narada.git
   cd narada
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up development environment**:
   ```bash
   cp .env.example .env.dev
   # Edit .env.dev with your development settings
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 🛠️ Development Guidelines

### Code Style

- Use ES6+ features where appropriate
- Follow existing code formatting and style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add user connection status monitoring
fix: resolve JWT token expiration issue
docs: update API documentation
style: improve responsive design for mobile
refactor: optimize user sorting algorithm
test: add unit tests for user management
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## 📝 Types of Contributions

### 🐛 Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Node.js version, browser)
- **Screenshots** if applicable
- **Error messages** or logs

### 💡 Feature Requests

For new features, please provide:

- **Clear description** of the feature
- **Use case** and benefits
- **Possible implementation** approach
- **Mockups or examples** if applicable

### 🔧 Code Contributions

1. **Check existing issues** to avoid duplicating work
2. **Create an issue** for discussion before major changes
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Ensure all tests pass** before submitting

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for new functions
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for functions and classes
- Document complex algorithms or business logic
- Update README.md for new features
- Keep API documentation current

### Examples

```javascript
/**
 * Parses WireGuard configuration file and extracts user information
 * @param {string} configPath - Path to the WireGuard configuration file
 * @returns {Promise<Array>} Array of user objects
 * @throws {Error} When configuration file cannot be read
 */
async function parseWireGuardConfig(configPath) {
  // Implementation here
}
```

## 🔍 Code Review Process

1. **Submit a Pull Request** with clear description
2. **Respond to feedback** promptly and professionally
3. **Make requested changes** in additional commits
4. **Squash commits** before merge if requested

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Clear commit messages
- [ ] PR description explains changes

## 🏷️ Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes

### Release Notes

- Document all user-facing changes
- Include migration guides for breaking changes
- Credit contributors

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different opinions and approaches

### Communication

- Use GitHub Issues for bug reports and feature requests
- Use GitHub Discussions for general questions
- Be patient and helpful with responses
- Search existing issues before creating new ones

## 🎯 Priority Areas

We're especially looking for contributions in these areas:

- **Security enhancements**
- **Performance optimizations**
- **Mobile responsiveness**
- **Accessibility improvements**
- **Test coverage**
- **Documentation**
- **Docker support**
- **Multi-language support**

## 🏆 Recognition

Contributors will be:

- Listed in the README.md
- Mentioned in release notes
- Invited to join the core team (for significant contributions)

## ❓ Questions?

- Check the [FAQ](https://github.com/your-org/narada/wiki/FAQ)
- Search [existing issues](https://github.com/your-org/narada/issues)
- Start a [discussion](https://github.com/your-org/narada/discussions)
- Contact maintainers directly

Thank you for contributing to NARADA! 🚀