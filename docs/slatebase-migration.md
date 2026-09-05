# GetSourced × Slatebase Migration Trigger (Phase 2 Roadmap)

> [!IMPORTANT]
> **FLAGGED FOR HUMAN REVIEW & OPERATOR SIGN-OFF**
> This document specifies the concrete, objective conditions required before initiating Phase 2 (migrating GetSourced's ingest pipeline and primary data store from Supabase to Slatebase). The exact thresholds below are proposed targets based on system reliability and must be reviewed and approved by the lead operator prior to Phase 2 cutover.

---

## 1. Current Architecture (Phase 1 Status)

| Subsystem | Backend | Status | Storage / DB |
|---|---|---|---|
| **Signups & Email Capture** | **Slatebase (Self-Hosted Appwrite)** | **Phase 1 Live** | `signups` collection on dedicated tenant `getsourced` |
| **Ingest Pipeline & Clustering** | **Supabase** | **Untouched** | `signals`, `clusters`, embeddings, public-apis cache |
| **LLM Draft Generation** | **Supabase + Omniroute/Ollama** | **Untouched** | `draft_ideas`, classifier cache |
| **Customer Auth & Billing** | **Supabase Auth + Razorpay** | **Untouched** | `subscribers`, webhooks |

*Note: The coexistence of Supabase for ingest and Slatebase for signups is intentional and by design during Phase 1.*

---

## 2. Objective Phase 2 Migration Triggers

Before migrating the ingest pipeline (`lib/ingest/*`, `lib/llm/*`, and database tables) from Supabase to Slatebase, ALL of the following criteria must be satisfied:

### Criterion A: Reliability & Uptime Gate
- **14 consecutive calendar days** of continuous operation on the Slatebase `signups` collection without an unhandled service outage.
- **Zero data-loss incidents**: Every submitted signup must have a verified document in the `signups` collection or dev backup ledger.
- **Availability > 99.8%**: API route `POST /api/signup` error rate (5xx) must remain below 0.2% over a rolling 14-day window.

### Criterion B: Throughput & Volume Validation
- A minimum of **100 successful signups** captured across production and staging environments without MariaDB lock contention or container restarts.
- Peak write concurrency tested up to **20 simultaneous signup submissions** with latency < 450ms.

### Criterion C: Operational Backup & Recovery
- Automated nightly backups of the `slatebase-getsourced-mariadb` volume active and verified via test restore to a staging container.
- Disaster recovery runbook tested: RPO < 24 hours, RTO < 60 minutes.

### Criterion D: Resource Headroom Verification
- Host compute monitoring confirms that the GetSourced tenant container stack (`sb-tenant-getsourced-appwrite`, `mariadb`, `redis`) operates within its Builder tier cgroup quotas:
  - CPU usage average < 30% of 1.0 vCPU quota.
  - Memory consumption < 1.2 GB of 2048MB RAM allocation.
  - MariaDB buffer pool hit ratio > 95%.

---

## 3. Phase 2 Scope & Transition Strategy

When triggers above are met and signed off by the human operator:
1. **Schema Migration**: Replicate Supabase relational schema (`signals`, `clusters`, `idea_drops`, `subscribers`) into Appwrite Collections or MariaDB tables.
2. **Ingest Pipeline Re-pointing**: Update repository methods in `lib/ingest/*` and `lib/idea-drops/*` to write directly to Slatebase.
3. **Dual-Write / Verification Window**: Run dual-write for 72 hours to verify parity between Supabase and Slatebase.
4. **Decommission Supabase Ingest**: Flip primary read/write traffic exclusively to Slatebase and archive Supabase historical snapshots.

---

## 4. Human Review & Decision Checklist

- [ ] Operator review of the 14-day reliability requirement.
- [ ] Confirmation of backup target location (Backblaze B2 / local secondary disk).
- [ ] Decision on whether to migrate Supabase Auth to Appwrite Auth or retain Supabase Auth during Phase 2.
- [ ] Formal sign-off to proceed to Phase 2 planning.
