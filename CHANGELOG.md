# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2026-01-23

### Fixed
- Fixed incorrect key/env configuration in Claude settings
- Migrated from apiUrl/anthropicApiKey fields to env.ANTHROPIC_* variables
- Fixed Claude Code integration to match actual configuration structure

### Changed
- Added support for model mappings (ANTHROPIC_DEFAULT_*_MODEL) in --claude persistent mode
- Simplified installation instructions in README

## [0.1.4] - 2026-01-19

### Added
- Support `runcc -- <args>` syntax for directly launching official Claude mode with argument passthrough
- This provides a more concise way to launch official Claude when no provider is needed

### Changed
- Updated usage examples in error messages to include the new `runcc -- <args>` syntax
- Enhanced publish skill with better pre-check workflow documentation
- Reorganized CLAUDE.md with clearer structure

## [0.1.3] - 2026-01-19

### Changed
- Renamed `npm-publish` skill to `publish` for consistency
- Removed deprecated `PLAN.md` file
- Updated project documentation and test files

## [0.1.2] - 2026-01-19

### Changed
- Renamed CLI command from `cc-run` to `runcc` for better naming consistency
- Improved output formatting with UTF-8 support for better Chinese character display in list command

### Added
- Added `.npmignore` configuration for cleaner package distribution
- Added Claude Code skills configuration for enhanced development workflow
- Added local testing script (`test-install.sh`) for installation verification

## [0.1.1] - 2026-01-19

### Added
- Initial release with multi-endpoint support
- Support for official Claude API and third-party providers (GLM, DeepSeek, Minimax)
- Custom endpoint management (add/remove)
- Proxy configuration support
- Configuration persistence in `~/.runcc/config.json`
- Integration with Claude CLI settings (`~/.claude/settings.json`)
