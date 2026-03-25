# BongBot-Ptero Security Analysis

## Executive Summary
BongBot-Ptero demonstrates several security strengths (AES-256-GCM encryption, SSRF protection via `Caller`) but has areas of concern in rate limiting and credential handling that could lead to denial of service and data compromise.

Mirasi's note - most of these have been accepted due to scale/size of the bot, therefore not a huge issue.

---

## 1. Threat Model

### 1.1 Primary Attack Vectors

**Server Nuking / Denial of Service (High)**
- No rate limiting on Pterodactyl API calls
- Bulk server control operations (stop all) have no cooldowns

**Data Exfiltration (High)**
- Pterodactyl API keys stored in database with no key rotation mechanism
- Encryption key exposure allows decryption of all stored API keys
- No file-level database encryption


**Bot Permission Abuse (Medium)**
- No audit trail for administrative actions

---

### 2.1 HIGH: No Rate Limiting on Any Command

**Location**: All subcommand handlers

No per-user cooldowns exist. A user can repeatedly invoke `/pterodactyl manage` to flood the Pterodactyl panel with API requests or trigger expensive database operations.

**Fix**: Add a simple cooldown map in the master command:
```typescript
private static cooldowns = new Map<string, number>();

private checkCooldown(userId: string, durationMs = 5000): boolean {
    const now = Date.now();
    const last = PterodactylMaster.cooldowns.get(userId) ?? 0;
    if (now - last < durationMs) return false;
    PterodactylMaster.cooldowns.set(userId, now);
    return true;
}
```

---

### 2.2 MEDIUM: Encryption Key Has No Rotation Mechanism

**Location**: `src/helpers/database.ts`

The encryption key is used directly from `process.env.ENCRYPTION_KEY` with no versioning. If the key is compromised, all stored API keys are exposed with no migration path.

**Fix**: Store a key version alongside the ciphertext and support reading older versions during rotation:
```typescript
interface EncryptedData { version: number; iv: string; authTag: string; data: string; }
```

---

### 2.3 MEDIUM: No Audit Logging for Sensitive Operations

No record is kept of who started, stopped, registered, updated, or deleted servers. There is no forensic trail for incident response.

**Fix**: Add an `audit_logs` table and write an entry for every state-changing operation, including `userId`, `action`, `serverId`, and `timestamp`.

---

## 3. Insecure Defaults

| Default | Risk | Recommendation |
|---------|------|----------------|
| No cooldown on any command | API spam / DoS | Add per-user cooldowns |

---

## 4. Hardening Recommendations

### Priority 1 — Implement Soon
1. Add per-user cooldowns (5–30s) on all subcommands

### Priority 2 — Technical Debt
2. Implement encryption key versioning for future rotation
3. Add audit logging table for state-changing operations
4. Add security-focused test cases: permission bypass, input edge cases

---

## 5. Security Testing Checklist

- [ ] Repeated invocations within the cooldown window are rejected
- [ ] `npm audit` shows no high/critical dependency vulnerabilities 
  - Mirasi's note - at time of writing, the only fix to the high vulnerabilities showing is to revert to version 13 of discord.js, which removes key features used by the commands. 
