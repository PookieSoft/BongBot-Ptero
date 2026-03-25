# BongBot-Ptero Architecture

## 1. Architectural Overview

### 1.1 Project Structure

BongBot-Ptero is a Discord.js-based bot built with TypeScript that provides Pterodactyl server management capabilities. The architecture follows a layered approach with clear separation of concerns:

```
/src
├── index.ts                          (Entry point & Bot lifecycle)
├── commands/
│   ├── buildCommands.ts              (Command registry builder)
│   └── pterodactyl/
│       ├── master.ts                 (Master command with subcommand routing)
│       ├── register_server.ts        (Subcommand: register new server)
│       ├── list_servers.ts           (Subcommand: list servers)
│       ├── server_status.ts          (Subcommand: view/manage server status)
│       ├── update_server.ts          (Subcommand: update configuration)
│       ├── remove_server.ts          (Subcommand: remove server)
│       └── shared/
│           ├── pterodactylApi.ts     (API wrapper functions)
│           ├── serverStatusEmbed.ts  (Embed building utilities)
│           └── serverControlComponents.ts (Discord UI components)
├── helpers/
│   └── database.ts                   (SQLite database wrapper)
└── services/
    └── databasePool.ts               (Singleton connection pool manager)
```

### 1.2 Architectural Layers

#### Presentation Layer (Commands)
- **Master Command** (`master.ts`): Acts as a router for subcommands
  - Instantiates subcommand handlers with dependency injection
  - Centralizes allowed hosts configuration
  - Provides `setupCollector` for interactive components

- **Subcommand Handlers** (register_server, list_servers, etc.): Implement command-specific logic
  - Each is a class with an `execute(interaction, bot)` method
  - Receives injected dependencies (Database, Caller)
  - Returns standardized response objects for Discord

#### Business Logic Layer (API & Components)
- **PterodactylApi** (`pterodactylApi.ts`): HTTP client wrapper around Caller
  - `fetchServers()`: Retrieve all servers from a Pterodactyl panel
  - `fetchServerResources()`: Get resource usage data for a server
  - `sendServerCommand()`: Execute power commands (start/stop/restart)

- **UI Component Builders** (serverStatusEmbed.ts, serverControlComponents.ts):
  - Pure functions that construct Discord embeds and interactive components
  - Format resource data for human-readable display
  - Build dynamic button/select menus based on server state

#### Data Access Layer (Database)
- **Database** (`database.ts`): SQLite wrapper
  - Wraps better-sqlite3 for synchronous database operations
  - Methods: addServer, deleteServer, updateServer, getServerById, getServersByUserId
  - Encrypts API keys using AES-256-GCM with random IV and auth tag
  - Parameterized SQL statements

- **DatabasePool** (`databasePool.ts`): Singleton connection pool
  - Lazily creates and caches Database instances per dbFileName
  - Manages lifecycle with `closeAll()` method
  - Respects `SERVER_DATABASE` env var for test/prod separation

#### Infrastructure Layer (Bot Lifecycle)
- **Index.ts** (Entry point):
  - Initializes Discord client with Guilds and MessageContent intents
  - Validates environment variables early (fail-fast pattern)
  - Registers commands via `buildCommands()`
  - Handles `interactionCreate` event for slash command routing
  - Handles `clientReady` event for post-deployment messaging
  - Manages message cleanup and deployment card generation

### 1.3 External Dependencies (bongbot-core)
- `Caller`: HTTP client with SSRF protection and allowedHosts configuration
- `LOGGER`: Logging service with DefaultLogger and FileLogger
- `buildError`, `buildUnknownError`: Standardized error response formatting
- `EMBED_BUILDER`: Discord embed utilities
- `generateCard`: GitHub info card generator for deployment messages
- `validateRequiredConfig`: Config validation utility
- `ExtendedClient`, `Logger`: TypeScript interfaces

---

## 2. Command Execution Flow

### 2.1 Slash Command Lifecycle

1. **User Interaction**: User types `/pterodactyl <subcommand>`
2. **Index Handler** (`interactionCreate` event):
   - Validates interaction is a command
   - Defers reply with loading flag
   - Retrieves command from `bot.commands` Collection
3. **Master Command Execute**:
   - Extracts subcommand name
   - Instantiates Caller with allowed hosts
   - Gets database connection from DatabasePool singleton
   - Routes to appropriate subcommand handler
4. **Subcommand Handler**:
   - Extracts interaction options
   - Validates input and calls domain logic (API calls, DB operations)
   - Returns response object with embeds/components/content
5. **Component Setup** (optional):
   - If handler has `setupCollector()`, creates message component collector
   - Handles button/select menu interactions for 10 minutes
6. **Response Return**:
   - Index handler follows up with the response
   - Collector listens for interactive component interactions

---

## 3. Identified Architectural Smells

### 3.1 Inline Instantiation in Master Command

**Location**: `master.ts`

**Issue**: Subcommand handlers are instantiated inside the `execute()` method on every invocation rather than at composition time. `getAllowedHosts()` is also called on every command.

**Consequences**:
- Tight coupling between master command and subcommand implementations
- Difficult to mock subcommands in tests of master.ts
- Dependency resolution happens at runtime, not at composition time

**Severity**: Medium

---

### 3.2 Collector Logic Lacks Type Safety

**Location**: `server_status.ts`, `index.ts`

**Issue**: `setupCollector` is detected at runtime via `typeof (command as any).setupCollector === 'function'` with no TypeScript interface enforcing the contract.

**Consequences**:
- No compile-time guarantee that collectors follow the same signature

**Severity**: High

---

### 3.3 Mixed Concerns in ServerStatus

**Location**: `server_status.ts`

**Issue**: `ServerStatus` handles three distinct responsibilities:
1. Business logic: validate user servers, fetch data, send commands
2. State polling: poll API until state changes
3. UI updates: edit Discord messages with new embeds/components

**Consequences**:
- Difficult to unit test state polling independently from Discord interactions
- Hard to reuse polling logic in other commands
- Violates Single Responsibility Principle

**Severity**: High

---

### 3.4 Synchronous Database Operations in Async Context

**Location**: `database.ts`

**Issue**: Uses better-sqlite3 (synchronous) which blocks the event loop during DB operations.

**Consequences**: Acceptable for small datasets, but limits scalability under load.

**Severity**: Low

---

## 4. Proposed Improvements

### 4.1 Type-Safe Collector Interface (Priority: High, Effort: Low)

Define a `CommandWithCollector` interface so `setupCollector` is enforced by the type system rather than detected at runtime. See TECHNICAL_DEBT.md §1.1 for implementation.

### 4.2 Extract State Polling to PollService (Priority: High, Effort: Medium)

```typescript
class PollService {
    async pollUntilCondition(
        condition: () => Promise<boolean>,
        options: { maxAttempts?: number; intervalMs?: number } = {}
    ): Promise<void> { ... }
}
```

### 4.3 Custom ID Builder/Parser (Priority: High, Effort: Medium)

```typescript
class ComponentIdBuilder {
    static serverControl(dbServerId: number, identifier: string, action: 'start' | 'stop' | 'restart') {
        return `server_control:${dbServerId}:${identifier}:${action}`;
    }
}

class ComponentIdParser {
    static parseServerControl(customId: string): { dbServerId: number; identifier: string; action: string } {
        const parts = customId.split(':');
        if (parts.length !== 4) throw new Error(`Invalid custom ID format: ${customId}`);
        return { dbServerId: parseInt(parts[1]), identifier: parts[2], action: parts[3] };
    }
}
```

---

## 5. Testing Architecture

- **Framework**: Jest with ESM support via ts-jest
- **HTTP Mocking**: MSW (Mock Service Worker)
- **Database Mocking**: Jest mocks for better-sqlite3
- **Test Structure**:
  - `tests/setup.ts`: Global MSW lifecycle
  - `tests/mocks/`: Handlers and server definitions
  - `tests/commands/`: Command-specific tests
  - `tests/helpers/`: Helper unit tests
  - `tests/services/`: Service unit tests

---

## 6. Summary

### Strengths
1. Clear layering: Presentation → Business Logic → Data Access
2. Dependency injection: subcommands receive dependencies rather than creating them
3. Consistent use of `buildError()` for user-facing error responses
4. Proper AES-256-GCM encryption for stored API keys
5. SSRF protection via `Caller` from bongbot-core
6. Commands grouped by feature with shared components extracted

### Improvements by Priority

| Priority | Improvement | Category |
|----------|-------------|----------|
| High | Type-safe collector interface | Type Safety |
| High | Extract polling to PollService | Separation of Concerns |
| High | Custom ID builder/parser | Type Safety |
| Medium | Subcommand factory pattern | Testability |
| Low | Typed Pterodactyl API response interfaces | Code Organisation |
| Low | Async database layer | Performance |
