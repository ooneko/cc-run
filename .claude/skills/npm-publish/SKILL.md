---
name: npm-publish
description: Automate npm package version bumping and publishing with comprehensive safety checks. Use when user requests "发布新版本", "publish to npm", "bump version", "release a new version", or similar package publishing tasks. Supports semantic versioning (patch/minor/major), git tagging, CHANGELOG updates, and pre-publish validation.
---

# NPM Publish

Automate the complete npm package release workflow with safety checks, version management, and changelog updates.

## Workflow

Follow this sequential workflow for publishing npm packages. Each step includes validation and confirmation points to ensure safe releases.

### Step 1: Pre-flight Checks

Before starting the release process, create a todo list with these items and verify the environment:

1. **检查 git 工作区状态**
   - Run `git status` to ensure working directory is clean
   - If there are uncommitted changes, ask user whether to commit them or abort

2. **确认当前分支**
   - Check current branch with `git branch --show-current`
   - Verify it's `main` or `master` (or other release branch)
   - If not on release branch, warn user and ask to confirm or switch

3. **检查 npm 登录状态**
   - Run `npm whoami` to verify npm authentication
   - If not logged in, instruct user to run `npm login`

4. **拉取最新代码**
   - Run `git pull` to ensure working with latest code
   - Check for any conflicts

### Step 2: Determine Version Bump Type

Ask the user which type of version bump to perform, unless they've already specified:

- **patch**: Bug fixes, minor changes (1.0.0 → 1.0.1)
- **minor**: New features, backward compatible (1.0.0 → 1.1.0)
- **major**: Breaking changes (1.0.0 → 2.0.0)
- **custom**: Specify exact version number

Use the `AskUserQuestion` tool if the version type wasn't specified in the initial request.

### Step 3: Run Tests and Build

Execute the project's quality checks:

1. **运行测试**
   - Check if `package.json` has a `test` script
   - Run `npm test` or equivalent command
   - If tests fail, abort the release and report errors

2. **运行构建**
   - Check if `package.json` has a `build` script
   - Run `npm run build` or equivalent command
   - If build fails, abort the release and report errors

### Step 4: Update CHANGELOG

If CHANGELOG.md exists in the project:

1. **Read recent commits**
   - Run `git log` to see commits since last release
   - Look for previous version tags with `git tag -l`

2. **Generate changelog entry**
   - Create a new section for the new version
   - List key changes based on commit messages
   - Format: `## [Version] - YYYY-MM-DD`
   - Group changes by type: Features, Bug Fixes, Breaking Changes, etc.

3. **Let user review and edit**
   - Show the generated changelog entry
   - Use `AskUserQuestion` to confirm or request modifications
   - Update CHANGELOG.md with the approved content

If no CHANGELOG.md exists, ask user if they want to create one.

### Step 5: Bump Version

Use npm's built-in version command:

```bash
npm version <patch|minor|major|x.y.z> -m "chore: release v%s"
```

This command will:
- Update version in `package.json` and `package-lock.json`
- Create a git commit with the specified message
- Create a git tag with the new version

### Step 6: User Confirmation

Before publishing, display a summary and ask for final confirmation:

```
Ready to publish:
- Package: <package-name>
- Current version: <old-version>
- New version: <new-version>
- Branch: <branch-name>
- Changes: <summary from changelog>

Proceed with publishing? (yes/no)
```

Use `AskUserQuestion` for this confirmation.

### Step 7: Publish to NPM

If user confirms, publish the package:

```bash
npm publish
```

Options to consider:
- `--access public` for scoped public packages
- `--tag <tag>` for pre-release versions (e.g., `beta`, `next`)
- `--dry-run` to test without actually publishing (useful for first-time testing)

### Step 8: Push to Git Remote

After successful npm publish:

1. **推送代码和标签**
   ```bash
   git push && git push --tags
   ```

2. **验证发布**
   - Confirm the new version appears on npmjs.com
   - Confirm the git tag appears on the remote repository

### Step 9: Summary

Report the successful release:

```
✅ Successfully published <package-name>@<new-version>

- NPM: https://www.npmjs.com/package/<package-name>
- Git tag: <tag-name>
- Changelog updated: Yes/No

Next steps:
- Create GitHub release (if applicable)
- Announce to team
- Update dependent projects
```

## Error Handling

If any step fails:

1. **Clearly state which step failed and why**
2. **Do not proceed to next steps**
3. **Provide actionable recovery steps**
4. **If version was bumped but publish failed:**
   - The version commit and tag already exist
   - User can either: fix the issue and run `npm publish` manually, or reset with `git reset --hard HEAD~1 && git tag -d v<version>`

## Rollback

If user needs to undo a release:

1. **Unpublish from npm** (only within 72 hours):
   ```bash
   npm unpublish <package-name>@<version>
   ```

2. **Delete git tag**:
   ```bash
   git tag -d v<version>
   git push origin :refs/tags/v<version>
   ```

3. **Revert version commit**:
   ```bash
   git reset --hard HEAD~1
   git push --force
   ```

**Warning**: Unpublishing is discouraged by npm. Prefer deprecating instead:
```bash
npm deprecate <package-name>@<version> "Reason for deprecation"
```

## Customization

Different projects may need adaptations:

- **Monorepo**: Use tools like `lerna` or `nx` for versioning multiple packages
- **Pre-release versions**: Use `npm version prerelease --preid=beta`
- **CI/CD**: This workflow is for manual releases; adapt for automated pipelines
- **Private registry**: Use `--registry` flag or `.npmrc` configuration
- **2FA**: npm may require OTP code during publish, prompt user to enter it

## Best Practices

1. **Always run tests before publishing**
2. **Keep CHANGELOG.md up to date**
3. **Use semantic versioning correctly**
4. **Review changes one final time before confirming**
5. **Never publish with uncommitted changes**
6. **Tag releases for easy reference**
7. **Announce breaking changes clearly**
