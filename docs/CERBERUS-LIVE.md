# Connecting the Cerberus view to a real lab

The page currently replays fixtures from `src/data/cerberus.ts` (machines, edges, pipeline stages, events, rules,
alerts, hunts, timeline). The UI in `src/scripts/cerberus-sim.ts` only reads those typed arrays, so a live source can
replace them without touching the views.

## What must exist first
1. The six VMs running (DC01 and WIN10-1 exist today; CA01, SRV01, SIEM01 and Kali are not built in the public repo).
2. Sysmon and Winlogbeat on the Windows hosts, shipping to SIEM01.
3. Elastic Stack or OpenSearch on SIEM01, with the Sigma rules converted and enabled.
4. The AD CS honeypot template and its audit logging on CA01.

## What the website would need
A **read-only** service next to the SIEM, publishing already-redacted data over HTTPS (or a periodic static export):

| Endpoint | Returns | Maps to |
|---|---|---|
| `GET /machines` | host, role, status | `machines` |
| `GET /events?from&to` | normalised documents (`event.code`, `host.name`, `user.name`, selected `winlog.event_data`) | `events` |
| `GET /alerts` | rule id, severity, trigger event ids | `alerts` |
| `GET /rules` | rule id, name, Sigma text | `rules` |

Requirements: no inbound path into the lab (export outward only), no credentials or hashes in any field, an allow-list of
event fields, rate limiting, CORS limited to the site origin, and no endpoint that can start or modify anything.

## Changes in the page
Replace the imports in `cerberus-sim.ts` with a loader that fills the same shapes, keep the "Simulation" banner until the
source is genuinely live, and change it to show the data's last-updated time. Scenario "steps" would become a replay of
real recorded runs.
