# ECO Change Management AI Automation

A fully offline, responsive ECO downstream change-management application for closed-network use. The app simulates an AI-agent orchestration engine with a deterministic local rules engine, local Bun API, and CSV-backed data directory.

## Requirements

- Bun 1.1+ (Windows or Linux)
- No internet connection is required after dependencies are installed.

## Install and run

```bash
bun install
bun run dev
```

The Vite UI runs on `http://localhost:5173` and the local API runs on `http://localhost:3000`.

For production-style local execution:

```bash
bun run build
bun run prod
```

`bun run prod` serves the local API and the compiled `dist` files can be served by any internal static server. The development command is the recommended immediate demo path.

## Offline architecture

The frontend contains no CDN scripts, remote CSS, web fonts, cloud database, or external AI calls. The Bun server keeps a serialized local store in `data/offline-store.json` and writes the primary operational datasets to CSV files in `data/` after each change. The local rule-based engine matches ECO process, line, product, and keyword signals against controlled document and competency metadata. This engine is deliberately replaceable by a future `InternalLLMEngine` or enterprise adapter without changing the UI contract.

## Local API

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/eco/start` | Create an approved ECO from manual or internal-system payload |
| `GET` | `/api/eco` | List ECO records |
| `GET` | `/api/eco/:id` | Read one ECO and its cascade records |
| `POST` | `/api/eco/:id/run` | Run local AI impact analysis and generate actions/training |
| `POST` | `/api/eco/:id/close` | Close only when downstream requirements are complete |
| `POST` | `/api/action/:id/complete` | Complete a document/workflow action |
| `POST` | `/api/training/:id/complete` | Complete a training assignment and open effectiveness |
| `GET` | `/api/dashboard` | Dashboard snapshot for the UI |
| `GET` | `/api/audit` | Audit trail records |

Example:

```bash
curl -X POST http://localhost:3000/api/eco/start \\
  -H "Content-Type: application/json" \\
  -d '{"ecoNumber":"ECO-2026-00129","title":"Change of fill pressure","description":"Increase approved fill pressure from 2.0 to 2.2 bar.","status":"Approved","process":"Chemical Mixing","productionLine":"Line 5","riskLevel":"High"}'
```

## CSV database

The server creates and refreshes these local datasets:

- `eco.csv` — ECO master records.
- `eco_impact.csv` — AI-identified downstream impacts.
- `workflow_actions.csv` — revision, review, and competency actions.
- `training_assignments.csv` — employee-level training cascade.
- `audit_log.csv` — event history and user/source context.

The UI also exposes the data management screen as the future expansion point for the remaining controlled-document, employee, effectiveness, rules, and configuration datasets.

## Demo scenario

The app starts with `ECO-2026-00125 — Chemical Mixing Temperature Change`. Use **Run AI impact analysis** on the dashboard or ECO detail page. The local engine identifies Control Plan, Work Instruction, SOJT, and Competency impacts; creates workflow actions; matches 47 employees; creates training assignments; updates status; and records audit events.

## Backup and restore

Back up the complete `data/` directory while the local server is stopped. To restore, replace the contents of `data/` with a known-good backup and start the application again. The JSON store is used to preserve the relational links between records, while the CSV files remain human-readable operational exports.

## Roles and governance

The UI is designed around local roles such as Administrator, Change Manager, Document Owner, Training Administrator, and Viewer. AI recommendations are visible with confidence, impact, matched fields, and rule rationale so authorized users can review or override them in a future permissions adapter. Closure is intentionally blocked while required actions or training remain incomplete.
