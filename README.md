# Ledger Customer 360

## Production implementation

The production application is the NestJS API in [apps/api](apps/api) and the Angular frontend in [apps/web](apps/web). This is the enterprise implementation for the Customer 360 platform.

- Backend: NestJS + TypeScript in [apps/api](apps/api)
- Frontend: Angular + TypeScript in [apps/web](apps/web)
- Shared contracts: [packages/contracts](packages/contracts)
- Infrastructure: [infra](infra)
- Local runtime stack: [docker-compose.yml](docker-compose.yml)

## Demo-only legacy layer

The files in the project root such as [server.js](server.js), [app.js](app.js), [data.js](data.js), [index.html](index.html), [styles.css](styles.css), and [schema.sql](schema.sql) are legacy demo assets used for early prototyping and local flow validation. They are not the production application architecture.

The Express mock server remains available only as a demonstration and should be treated as a demo artifact, not as the enterprise system of record.

## Run locally

### Canonical application

```powershell
npm install
npm run dev:api
npm run dev:web
```

The only application pair is the NestJS API in [apps/api](apps/api) and the Angular frontend in [apps/web](apps/web). Compose builds the same two applications.

Open the frontend at `http://localhost:4200`. Local role credentials are `r.mehta` / `rm123`, `s.iyer` / `manager123`, `k.das` / `operations123`, and `p.singh` / `auditor123`. Change these demo credentials before any shared or production deployment.

The former root Express demo files are retained as historical reference only and are not part of the Compose runtime.

## Included workflows

Role-aware login and server-side masking, customer search, profile and account/loan/card views, paginated transaction history, interaction notes, service requests with enforced transitions, grounded AI summary/NBA/chat/contact-plan flows, manager portfolio metrics, and searchable/exportable audit history are all wired through the client.

## Target production architecture

- **Frontend:** Angular + TypeScript + Angular Material. The current API contract remains the typed service boundary and the view layer is structured in standalone components, route guards, and Material tables/dialogs.
- **Backend:** Node.js + NestJS + TypeScript. Split modules into `Auth`, `Customers`, `ServiceRequests`, `Copilot`, and `Audit`; use Keycloak OIDC/JWT guards and role decorators.
- **Data:** PostgreSQL is the system of record for customer, portfolio, product, workflow, and audit entities. Enable `pgvector` for grounded retrieval. Use MongoDB for conversation/session documents and model traces that do not need relational joins.
- **AI:** Ollama hosts a small open-weight model behind a NestJS provider. Retrieval must build context from authorized PostgreSQL rows, return source IDs, and persist every generation and human decision.
- **Observability:** Instrument NestJS and database calls with OpenTelemetry. Export OTLP to the Collector, scrape application metrics with Prometheus, and use Grafana dashboards for latency, errors, AI calls, and workflow throughput.
- **Deployment:** [docker-compose.yml](docker-compose.yml) provides the local dependency topology. For cloud deployment, publish the app image to a registry, use managed PostgreSQL/MongoDB, run Keycloak with an external database, keep Ollama on a GPU node when needed, and provision secrets through the cloud secret manager.

The Angular workspace contains standalone Material UI, typed models, an auth interceptor, a debounced customer search service, portfolio KPIs, risk/status signals, and a responsive relationship detail panel. The Nest workspace contains the API bootstrap, Swagger, Keycloak guard, PostgreSQL repository, pgvector retrieval service, MongoDB conversation persistence, Ollama provider, and OpenTelemetry startup.

## Local platform services

```powershell
docker compose up --build
```

Compose starts only the canonical frontend on `4200` and API on `4100`. The demo API uses in-memory seed data so the trainer workflow works without Keycloak, databases, Ollama, or observability containers.

## Security notes

The demo token store is intentionally not production authentication. Replace it with Keycloak-issued JWT validation before deployment. Keep raw card/PAN data out of application databases, enforce portfolio checks in every service handler, redact sensitive fields at the API boundary, and retain immutable audit events for data access and AI decisions.