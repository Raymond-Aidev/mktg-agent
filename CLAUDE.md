# CLAUDE.md - AI Assistant Guidelines for GoldenCheck

This document provides essential context and guidelines for AI assistants working with the GoldenCheck codebase.

## Project Overview

**GoldenCheck** is a new project. This CLAUDE.md file serves as the foundational documentation for AI assistants and should be updated as the project evolves.

## Repository Structure

```
GoldenCheck/
├── CLAUDE.md          # AI assistant guidelines (this file)
└── (project files to be added)
```

*Update this section as the project structure develops.*

## Development Environment

### Prerequisites

<!-- Update with actual requirements -->
- [ ] Define required runtime/language versions
- [ ] List required tools and dependencies
- [ ] Document environment variables needed

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd GoldenCheck

# Additional setup steps to be documented
```

## Common Commands

<!-- Update this section with actual commands as they are established -->

| Command | Description |
|---------|-------------|
| `TBD` | Build the project |
| `TBD` | Run tests |
| `TBD` | Start development server |
| `TBD` | Lint/format code |

## Code Style & Conventions

### General Guidelines

1. **Consistency**: Follow existing patterns in the codebase
2. **Simplicity**: Prefer simple, readable solutions over clever ones
3. **Documentation**: Add comments for non-obvious logic
4. **Testing**: Include tests for new functionality

### Naming Conventions

<!-- Update with project-specific conventions -->
- Use descriptive, meaningful names
- Follow language-specific conventions (camelCase, snake_case, etc.)

### File Organization

<!-- Document file organization patterns as they emerge -->
- Group related files together
- Keep file sizes manageable
- Use consistent file naming

## Git Workflow

### Branch Naming

- Feature branches: `feature/<description>`
- Bug fixes: `fix/<description>`
- Documentation: `docs/<description>`
- Claude AI branches: `claude/<description>-<session-id>`

### Commit Messages

Write clear, descriptive commit messages:
- Use imperative mood ("Add feature" not "Added feature")
- Keep subject line under 72 characters
- Reference issue numbers when applicable

### Pull Requests

- Provide clear description of changes
- Include testing instructions
- Link related issues

## Testing

<!-- Update with actual testing practices -->

### Running Tests

```bash
# Command to run tests (TBD)
```

### Test Conventions

- Write tests for new features
- Maintain existing test coverage
- Use descriptive test names

## Architecture Notes

<!-- Document key architectural decisions as they are made -->

*Architecture documentation to be added as the project develops.*

## Key Files Reference

<!-- List important files and their purposes -->

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI assistant guidelines |

## Common Tasks

### Adding a New Feature

1. Create a feature branch
2. Implement the feature
3. Add tests
4. Update documentation if needed
5. Submit pull request

### Fixing a Bug

1. Create a fix branch
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Verify the test passes
5. Submit pull request

## Troubleshooting

<!-- Document common issues and solutions -->

*Common issues and solutions will be documented here as they arise.*

## External Resources

<!-- Add links to relevant documentation, APIs, etc. -->

*External resources to be added as needed.*

---

## Maintaining This Document

This CLAUDE.md should be updated when:

- New major features are added
- Development workflows change
- New conventions are established
- Common issues are discovered
- Project structure significantly changes

**Last Updated**: January 2026 (Initial creation)
