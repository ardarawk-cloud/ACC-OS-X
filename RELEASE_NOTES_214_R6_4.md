# ACC OS X Build 214 R6.4 — Backup & Recovery Hardening

- Fixes exported backup filename to Build 214 R6.4.
- Adds versioned ACC OS X backup envelope metadata.
- Keeps backward compatibility with older raw-state JSON backups.
- Validates imported/restored state before applying it.
- Creates automatic Pre-Import Safety Backup.
- Creates automatic Pre-Restore Safety Backup for one-step rollback protection.
- Re-normalizes channel contexts and AI-note isolation after import/restore.
- Does not modify Cloudflare AI secrets, Workers AI binding, branding, registry counts, or production logic.
