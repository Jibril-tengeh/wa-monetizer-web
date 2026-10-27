# Security Specification & "Dirty Dozen" Audit - WA Monetizer

## 1. Data Invariants & Multi-Tenant Boundaries
1. **Tenant Isolation:** Every `groups`, `plans`, `members`, `subscriptions`, `payments`, and `auditLogs` document is partitioned by `adminId`. An administrator can only list, read, or modify documents where `adminId == request.auth.uid`.
2. **Immutable System Fields:** Crucial fields (`createdAt`, `adminId`, `idempotencyKey`) cannot be altered post-creation.
3. **Financial Integrity:** Payment documents cannot be forged or arbitrarily altered from the client; status updates must obey valid state transitions.
4. **Subscription Integrity:** Member expiration date (`expiresAt`) and status (`active`, `expired`, `suspended`, etc.) can only be modified by the authorized admin or verified server logic.
5. **No Blind Privilege Escalation:** Users cannot elevate their own role to `superadmin` in `users/{userId}`.
6. **Denial-of-Wallet Guard:** String fields are bounded with strict `.size() <= MAX` constraints and IDs with `isValidId()`.

---

## 2. The "Dirty Dozen" Threat Payloads

| Payload # | Vector | Target Path | Malicious Intent | Expected Rule Action |
|---|---|---|---|---|
| **#1** | Shadow Update Attack | `/groups/{groupId}` | Injects unauthorized field `unrestrictedFreePass: true` during update | `PERMISSION_DENIED` via `hasOnly()` gate |
| **#2** | Cross-Tenant Steal | `/members/{memberId}` | Admin B attempts to read or mutate Member belonging to Admin A | `PERMISSION_DENIED` via `adminId == request.auth.uid` |
| **#3** | Self-Role Escalation | `/users/{userId}` | Admin modifies their own profile to `{ "role": "superadmin" }` | `PERMISSION_DENIED` via role immutability |
| **#4** | Payment Amount Tampering | `/payments/{paymentId}` | Client writes payment with amount reduced from 150 to 1 GHS | `PERMISSION_DENIED` via strict schema & server authorization |
| **#5** | Free Expiration Extension | `/members/{memberId}` | Unauthenticated or cross-tenant client pushes `expiresAt` 10 years into the future | `PERMISSION_DENIED` |
| **#6** | ID Poisoning Attack | `/groups/{veryLongGarbageString10KB}` | Client passes 10KB string as Document ID to exhaust indexing resources | `PERMISSION_DENIED` via `isValidId()` |
| **#7** | Terminal State Tamper | `/payments/{paymentId}` | Client modifies an already `verified` or `refunded` payment back to `pending` | `PERMISSION_DENIED` via terminal state gate |
| **#8** | Query Scraping / Blanket List | `/payments` | Non-scoped query `collection(db, "payments")` without `where("adminId", "==", auth.uid)` | `PERMISSION_DENIED` via `resource.data.adminId == request.auth.uid` |
| **#9** | Audit Log Mutation | `/auditLogs/{logId}` | Client attempts to `update` or `delete` historical audit record | `PERMISSION_DENIED` (Audit logs are append-only/immutable) |
| **#10** | Spoofed Admin Email | `/groups/{groupId}` | Token with spoofed email without `email_verified == true` | `PERMISSION_DENIED` via email verification verification |
| **#11** | Massive Field Buffer Overflow | `/plans/{planId}` | Description string with 2MB junk text | `PERMISSION_DENIED` via `val.size() <= 500` |
| **#12** | Anonymous Group Creation | `/groups/{groupId}` | Unauthenticated visitor attempts to create group | `PERMISSION_DENIED` via `isSignedIn()` |
