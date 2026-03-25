# BongBot-Ptero: Project DX, UX, and Operational Analysis

## 1. Current Strengths

### 1.1 Code Organisation & Maintainability
- **Clear architectural layering**: Presentation (commands), business logic (API wrappers), data access (database), and infrastructure (bot lifecycle) are cleanly separated.
- **Dependency injection pattern**: Subcommands receive `Database` and `Caller` instances, enabling testability and reducing coupling.
- **Consistent command structure**: All subcommands follow a uniform class-based pattern with `execute()` and constructor injection.
- **Reusable shared components**: `pterodactylApi.ts`, `serverStatusEmbed.ts`, and `serverControlComponents.ts` are pure utility functions that are easy to compose and test.

### 1.2 Testing Infrastructure
- **Comprehensive Jest setup** with ESM + TypeScript support via `ts-jest`.
- **MSW for HTTP mocking**: Clean separation of HTTP concerns; handlers are isolated per test file.
- **Coverage tracking**: Jest configured with LCOV output; CI/CD uploads to Codecov with per-PR coverage reports.
- **Test utilities**: `commandTestUtils.ts` provides reusable mock interaction and client builders.

### 1.3 Security Foundations
- **AES-256-GCM encryption** for stored Pterodactyl API keys with random IV and authentication tag.
- **SSRF protection** via `Caller` allowedHosts validation from `PTERODACTYL_ALLOWED_HOSTS` env var.
- **Parameterised SQL** prevents injection attacks.
- **Fail-fast config validation**: `validateRequiredConfig()` in `index.ts` catches missing env vars at startup.

### 1.4 Deployment & CI/CD
- **Automated semantic versioning**: PR labels (`major`/`minor`/`patch`) or commit keywords drive version bumps.
- **Multi-stage distroless Dockerfile**: Builder stage compiles; release stage uses `gcr.io/distroless/nodejs24-debian12`, minimising attack surface.
- **Test gate before deploy**: Production workflow runs the full test suite with coverage before any Docker build.
- **Systemd service templates**: `daemons/` includes production and develop daemon unit files with restart-on-failure.
- **Weekly vulnerability scanning**: Trivy scans the Docker image weekly and opens a PR automatically if new CVEs are found.

---

## 2. Missing Features / UX Friction Points

### 2.1 API Key Submitted in Plaintext Slash Command Argument

Users paste their Pterodactyl API key as a visible slash command option. Discord logs slash command usage in the server's audit log, meaning the key is visible to server admins.

**Fix**: Accept the API key via a Modal (pop-up text input), which is not logged in Discord's audit log.

---

### 2.4 Destructive Operations Lack Confirmation

`/pterodactyl remove` deletes a server registration immediately, and the "Stop All Servers" button acts immediately. There is no "are you sure?" step.

**Fix**: Add a confirmation Modal or ephemeral button prompt before executing destructive operations.

---


### 2.6 Generic Error Messages

Raw exception messages are surfaced to users via `buildError()`. Users cannot distinguish between "invalid API key", "panel unreachable", and "server not found" without reading the raw error.

**Fix**: Map known error conditions to user-friendly messages with actionable advice.

---

## 3. Documentation Gaps

### 3.1 No Production Setup Runbook
There is no guide covering:
- How to generate a valid `ENCRYPTION_KEY` (64 hex chars)
- How to initialise the database on first run
- How to configure Discord bot permissions and intents in the Developer Portal
- How to register systemd service files on the host

### 3.2 No Troubleshooting Guide
Common failure scenarios ("bot is offline", "command times out", "API returns 403") have no first-aid steps documented.

### 3.3 No `.env.example`
There is no `.env.example` file. Contributors must read `CLAUDE.md` and `validateRequiredConfig()` to discover what variables are needed.

**Fix**: Add `.env.example` with a commented entry for every required and optional variable.

### 3.4 No CHANGELOG
Releases contain only the raw commit message as the release body. There is no human-readable record of what changed between versions.

### 3.5 Encryption Key Rotation Not Documented
There is no guidance on how to safely rotate `ENCRYPTION_KEY` without breaking existing stored API keys.

### 3.6 No Contributing Guide
New contributors have no documented path: no issue labels for good first issues, no PR template beyond the CI label requirement.

---

## 4. DX (Developer Experience) Improvements

### 4.1 Missing npm Scripts

`package.json` has no `lint`, `format`, or `type-check` scripts. CLAUDE.md specifies naming conventions but there is no tooling to enforce them.

**Recommended additions**:
```json
"lint": "eslint src tests --ext .ts",
"format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
"type-check": "tsc --noEmit"
```

### 4.2 No Linter or Formatter Configuration

No ESLint or Prettier config files exist. 4-space indentation and naming conventions are documented in CLAUDE.md but not automatically enforced.

**Fix**: Add `.eslintrc.json` and `prettier.config.js` matching CLAUDE.md conventions; integrate into the PR CI workflow.

### 4.3 Test Factory Boilerplate is Spread Across Files

Each test file independently sets up MSW handlers and bongbot-core mocks. Centralising these in `/tests/factories/` would reduce duplication and make tests easier to write.

**Fix**: Create `tests/factories/interaction.ts`, `tests/factories/database.ts`, and move shared bongbot-core mocks to `tests/setup.ts`.

### 4.5 Request Correlation Not Fully Utilised

`bongbot-core`'s `LOGGER` methods accept a `ChatInputCommandInteraction` parameter and automatically store `interaction.id` as a `correlation_id` field in log output. However, not all logging calls in ptero pass the interaction, so some log entries lack correlation.

**Fix**: Ensure all `LOGGER` calls in subcommands and API wrappers pass the interaction where available.

### 4.6 No Subcommand Scaffold Tool

Adding a new subcommand requires manually creating a class file, a test file, updating `master.ts`'s switch statement, and updating `buildCommands.ts`. A code generation script would reduce the chance of missing a step.

---

## 5. Recommendations by Priority

| Priority | Item | Effort |
|----------|------|--------|
| P1 | Modal for API key input | 1 hour |
| P1 | Confirmation step for remove / stop-all | 1 hour |
| P1 | `.env.example` with comments | 30 min |
| P2 | ESLint + Prettier config + CI integration | 1 hour |
| P2 | Centralised test factories | 2 hours |
| P3 | CHANGELOG.md | Ongoing |
| P3 | Production setup runbook (DEPLOYMENT.md) | 2 hours |
| P3 | Troubleshooting guide | 1 hour |
| P3 | Encryption key rotation documentation | 1 hour |
