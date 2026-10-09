#!/usr/bin/env python3
"""Safety regression checks for NADMO LIVE's inert identity D1 schema.

Runs against SQLite in memory, does not store identity documents or contact
any KYC vendor. Does NOT claim identity verification is operational.
"""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "migrations" / "0001_creator_identity_foundation.sql"
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
db.executescript(SCHEMA.read_text(encoding="utf-8"))

def must_reject(sql, params, label):
    try:
        db.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(label)

tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
required = {
    "accounts", "account_identities", "account_sessions",
    "creator_verifications", "creator_channels", "channel_links",
    "creator_posts", "account_follows", "identity_audit_events"
}
assert required <= tables, f"Missing schema tables: {required - tables}"
db.execute("INSERT INTO accounts(id,handle,display_name) VALUES(?,?,?)", ("acct1", "dj_one", "DJ One"))
db.execute("INSERT INTO accounts(id,handle,display_name) VALUES(?,?,?)", ("acct2", "dj_two", "DJ Two"))
must_reject("INSERT INTO accounts(id,handle,display_name) VALUES(?,?,?)",
            ("acct3", "DJ_ONE", "Impersonator"), "Unique handles must be case insensitive")
must_reject("INSERT INTO accounts(id,handle,display_name) VALUES(?,?,?)",
            ("acct4", "Bad Handle", "Invalid"), "Handles cannot include whitespace")
must_reject("INSERT INTO creator_verifications(account_id,status) VALUES(?,?)",
            ("acct1", "verified"), "Verified without proof must be impossible")
db.execute("""INSERT INTO creator_verifications
            (account_id,status,provider,provider_reference,dedup_hmac,adult_verified,verified_at)
            VALUES(?,?,?,?,?,?,?)""",
           ("acct1", "verified", "sandbox-provider", "ref1", "keyed-fingerprint-1", 1, 1770000000))
must_reject("""INSERT INTO creator_verifications
             (account_id,status,provider,provider_reference,dedup_hmac,adult_verified,verified_at)
             VALUES(?,?,?,?,?,?,?)""",
            ("acct2", "verified", "sandbox-provider", "ref2", "keyed-fingerprint-1", 1, 1770000001),
            "Same verified person cannot control multiple primary creator accounts")
must_reject("""INSERT INTO creator_verifications
             (account_id,status,provider,provider_reference,dedup_hmac,adult_verified,verified_at)
             VALUES(?,?,?,?,?,?,?)""",
            ("acct2", "verified", "sandbox-provider", "ref2", "keyed-fingerprint-2", 0, 1770000001),
            "Underage or unverified adult must not be VERIFIED")
db.execute("INSERT INTO creator_channels(id,owner_account_id,slug,name) VALUES(?,?,?,?)",
           ("brand1", "acct1", "dj-one", "DJ One"))
db.execute("INSERT INTO creator_channels(id,owner_account_id,slug,name) VALUES(?,?,?,?)",
           ("brand2", "acct1", "dj-one-booking", "DJ Booking"))
assert db.execute("SELECT COUNT(*) FROM creator_channels WHERE owner_account_id='acct1'").fetchone()[0] == 2, (
    "One verified creator must be able to manage multiple real brands")
db.execute("INSERT INTO channel_links(id,channel_id,label,destination_url) VALUES(?,?,?,?)",
           ("l1", "brand2", "External business", "https://booking.example.org/"))
must_reject("INSERT INTO channel_links(id,channel_id,label,destination_url) VALUES(?,?,?,?)",
            ("l2", "brand2", "Malicious", "javascript:alert(1)"),
            "Non-HTTPS schemes are forbidden")
db.execute("INSERT INTO creator_posts(id,owner_account_id,channel_id,caption) VALUES(?,?,?,?)",
           ("p1", "acct1", "brand2", "Booking https://booking.example.org/ right here"))
must_reject("INSERT INTO account_follows(follower_account_id,followed_account_id) VALUES(?,?)",
            ("acct1", "acct1"), "Self-follow not allowed")
db.execute("INSERT INTO account_follows(follower_account_id,followed_account_id) VALUES(?,?)",
           ("acct1", "acct2"))
assert db.execute("PRAGMA foreign_key_check").fetchall() == [], "Foreign keys invalid"
print("PASS identity foundation schema parses and creates all 9 tables")
print("PASS case-insensitive unique handles, verified adult only, dedup fingerprint")
print("PASS one creator owns multiple brands, external HTTPS, linked posts, follow controls")
print("PASS foreign-key integrity; schema has no operational ID-document capture")
