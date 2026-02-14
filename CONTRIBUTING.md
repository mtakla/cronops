# Contributing to CronOps

First off, thank you for considering contributing to CronOps! It's people like you that make CronOps such a great tool for the containerized workflow community.

## 🌟 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (job configuration files, logs, etc.)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (OS, Docker version, CronOps version)
- **Add screenshots or logs** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most CronOps users
- **List any alternatives** you've considered

### Pull Requests

We welcome pull requests! Here's how to submit one:

1. **Fork the repository** and create your branch from `master`
2. **Make your changes** following our coding standards
3. **Add tests** if you've added code that should be tested
4. **Ensure the test suite passes** by running `npm test`
5. **Format your code** using `npm run check:fix`
6. **Update the documentation** if needed
7. **Write a clear commit message** describing your changes

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/cronops.git
cd cronops

# Install dependencies
npm install

# Run tests
npm test

# Run linter and formatter
npm run check

# Build the project
npm run build

# Run in development mode
npm run dev
```

#### Coding Standards

- Use **TypeScript** for all new code
- Follow the existing **code style** (enforced by Biome)
- Write **meaningful commit messages** (use conventional commits format)
- Add **JSDoc comments** for public APIs
- Keep functions **small and focused**
- Write **unit tests** for new features

#### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(job-runner): add support for retry on failure

- Added retry_count and retry_delay configuration options
- Updated job runner to handle retries automatically
- Added tests for retry logic

Closes #123
```

## 🎯 Good First Issues

Looking for a place to start? Check out issues labeled [`good first issue`](https://github.com/mtakla/cronops/labels/good%20first%20issue) - these are beginner-friendly issues that are perfect for new contributors.

## 📚 Documentation

Improvements to documentation are always welcome! This includes:

- README updates
- Code comments and JSDoc
- Usage examples
- Tutorial content
- Blog posts or articles about CronOps

## 💬 Community

- **Questions?** Open a [GitHub Discussion](https://github.com/mtakla/cronops/discussions)
- **Bug reports?** Create an [Issue](https://github.com/mtakla/cronops/issues)
- **Ideas?** Share them in [Discussions](https://github.com/mtakla/cronops/discussions)

## 📝 License

By contributing, you agree that your contributions will be licensed under the same [ISC License](LICENSE) that covers the project.

## 🙏 Thank You!

Your contributions to open source, large or small, make projects like CronOps possible. Thank you for taking the time to contribute!

---

**Happy Contributing! 🚀**
