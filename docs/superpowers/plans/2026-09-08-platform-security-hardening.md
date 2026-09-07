# Platform Security Hardening (All 7 Pillars) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive defense-in-depth security across Sourced covering transport headers, framework vulnerability patching, cryptographic timing defenses, multi-tenant database isolation, distributed rate limiting, CSRF/origin validation, and real-time security alerting.

**Architecture:** Layered security model: Edge/Transport (HSTS/COOP/CORP) -> Application Layer (safe redirects, CSRF/Origin checks, constant-time cron auth, patched Next.js) -> Persistence Layer (dedicated schema separation guardrails and RLS verification) -> Telemetry (real-time incident alerting via ntfy).

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Node.js `crypto`, Supabase PostgreSQL, ntfy.sh push notifications, Vitest.

---

## Global Constraints
- Do NOT modify Mettel-owned tables in the shared Supabase instance.
- All server-only files must retain `import "server-only";`.
- Preserves all 42 existing Vitest test files (209 tests).
- All changes must pass `npm run typecheck` and `npm run test` cleanly.

---

### Task 1: HTTP Security Headers Hardening

**Files:**
- Modify: `next.config.mjs`
- Test: `tests/security-headers.test.ts`

**Interfaces:**
- Produces: Enhanced HTTP response headers on `/:path*` route matcher.

- [ ] **Step 1: Write test for new security headers**
  Create `tests/security-headers.test.ts` testing `nextConfig.headers()` output for:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `X-DNS-Prefetch-Control: on`

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/security-headers.test.ts`
  Expected: FAIL

- [ ] **Step 3: Update `next.config.mjs`**
  Add the missing headers to the `/:path*` block in `nextConfig.headers()`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/security-headers.test.ts`
  Expected: PASS

---

### Task 2: Framework Vulnerability Patching (`next`)

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: Patched Next.js framework resolving critical/high CVEs without breaking App Router API compatibility.

- [ ] **Step 1: Update Next.js version in `package.json`**
  Bump `"next": "14.2.5"` to `"next": "14.2.25"` (or `14.2.35`).
- [ ] **Step 2: Install patched dependencies**
  Run: `npm install`
- [ ] **Step 3: Verify build and test suite**
  Run: `npm run typecheck && npm run test`
  Expected: PASS with 0 errors.
- [ ] **Step 4: Run npm audit check**
  Run: `npm audit` to confirm critical CVEs are resolved.

---

### Task 3: Constant-Time Cron & Internal Secret Authentication

**Files:**
- Modify: `lib/ingest/require-cron.ts`
- Test: `lib/ingest/require-cron.test.ts`

**Interfaces:**
- Consumes: `request.headers.get("authorization")`, `process.env.CRON_SECRET`
- Produces: `isAuthorizedCronRequest(request: Request): boolean` with constant-time equality check.

- [ ] **Step 1: Write unit tests for cron authorization**
  Create `lib/ingest/require-cron.test.ts` covering:
  - Matching Bearer token -> `true`
  - Mismatched token -> `false`
  - Missing authorization header -> `false`
  - Missing `CRON_SECRET` env var -> `false`
  - Token with differing length -> `false`

- [ ] **Step 2: Update `lib/ingest/require-cron.ts`**
  Use `createHash("sha256")` and `timingSafeEqual()` to compare the provided Authorization header against `Bearer ${secret}` in constant time.

- [ ] **Step 3: Run test to verify it passes**
  Run: `npx vitest run lib/ingest/require-cron.test.ts`
  Expected: PASS

---

### Task 4: Cross-Tenant Database Separation (Schema Migration & Guide)

**Files:**
- Create: `supabase/migrations/0031_tenant_schema_guardrails.sql`
- Create: `docs/database-tenant-isolation.md`

**Interfaces:**
- Produces: SQL definitions for isolated `sourced` namespace and actionable migration runbook for separating Sourced from Mettel into a standalone Supabase project.

- [ ] **Step 1: Create `0031_tenant_schema_guardrails.sql`**
  Define `CREATE SCHEMA IF NOT EXISTS sourced;` and provide zero-downtime view aliases and role permission scoping to protect against cross-tenant collisions.
- [ ] **Step 2: Create isolation guide `docs/database-tenant-isolation.md`**
  Document the exact process for provisioning a dedicated Sourced Supabase project and transferring Sourced-only tables without touching Mettel.

---

### Task 5: Distributed Edge Rate Limiting Guardrails

**Files:**
- Modify: `lib/security/rate-limit.ts`
- Test: `lib/security/rate-limit.test.ts`

**Interfaces:**
- Consumes: `key: string`, `limit: number`, `windowMs: number`
- Produces: `checkRateLimitAsync(key, limit, windowMs): Promise<RateLimitResult>` with edge REST Upstash support + in-memory fallback.

- [ ] **Step 1: Write tests for rate limiting in `lib/security/rate-limit.test.ts`**
  Test in-memory fallback rate limiting and sliding window expiry.
- [ ] **Step 2: Implement edge REST Upstash client with in-memory fallback**
  If `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` are set, execute distributed rate check; otherwise smoothly fallback to the sliding window memory map.
- [ ] **Step 3: Run test to verify it passes**
  Run: `npx vitest run lib/security/rate-limit.test.ts`
  Expected: PASS

---

### Task 6: CSRF & Origin Validation on Public Forms

**Files:**
- Create: `lib/security/csrf.ts`
- Test: `lib/security/csrf.test.ts`
- Modify: `app/api/newsletter/route.ts`
- Modify: `app/api/signup/route.ts`
- Modify: `app/api/account/topics/route.ts`

**Interfaces:**
- Produces: `verifySameOrigin(request: Request): { ok: boolean; reason?: string }`

- [ ] **Step 1: Write test for origin verification**
  Create `lib/security/csrf.test.ts` testing:
  - Request with matching Host and Origin -> `{ ok: true }`
  - Request with `sec-fetch-site: same-origin` -> `{ ok: true }`
  - Request with untrusted external Origin -> `{ ok: false }`
  - Request with cross-site sec-fetch-site -> `{ ok: false }`

- [ ] **Step 2: Implement `verifySameOrigin` in `lib/security/csrf.ts`**
  Validate `sec-fetch-site` and `origin` against host header and allowed domains.

- [ ] **Step 3: Guard state-changing POST endpoints**
  Integrate `verifySameOrigin` at the entry of `/api/newsletter`, `/api/signup`, and `/api/account/topics`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run lib/security/csrf.test.ts`
  Expected: PASS

---

### Task 7: Real-Time Security Incident Alerts

**Files:**
- Create: `lib/security/alerts.ts`
- Test: `lib/security/alerts.test.ts`
- Modify: `lib/auth/require-admin.ts`
- Modify: `app/api/webhooks/razorpay/route.ts`

**Interfaces:**
- Produces: `recordSecurityIncident(event: SecurityIncident): Promise<void>`

- [ ] **Step 1: Write unit tests in `lib/security/alerts.test.ts`**
  Verify alert dispatch formatting and fallback error handling.
- [ ] **Step 2: Implement `recordSecurityIncident` in `lib/security/alerts.ts`**
  Connect to `notify()` from `lib/notify.ts` to dispatch instant push notifications on high-severity security triggers (unauthorized admin access, forged webhook signatures, extreme rate limit abuse).
- [ ] **Step 3: Connect security alerts to `requireAdmin` and Razorpay webhook failure**
  Notify on failed admin authorization attempts and failed webhook HMAC verification.
- [ ] **Step 4: Run tests to verify it passes**
  Run: `npx vitest run lib/security/alerts.test.ts`
  Expected: PASS

---

## Verification Plan

### Automated Tests
- Run `npm run typecheck`
- Run `npm run test`
- Run `npm run audit:rls`
- Run `npm audit`

### Manual Verification
- Verify HTTP response headers via `curl -I http://localhost:3000`
- Test CSRF rejection with mocked foreign origin request
- Test cron rejection with mismatched bearer secret
