# Role-Based Presentation UI Concepts

**Status:** Concept specification for client discussion. The screens below are not implemented Android routes and are not connected to a database, dispatch service, LGU system, identity provider, or production map service.

## Shared visual and data rules

- Keep the existing JuanTrike emerald, lime, navy/royal blue, warm yellow, white, and light-neutral palette. Use the existing spacing, radius, typography, card, badge, and button tokens.
- Treat these as responsive web-style staff workspaces. Use a compact navigation drawer and stacked cards on phones; use a persistent left navigation rail and wider tables on tablets and desktop. Do not scale a desktop table down to phone width.
- Put a persistent `CONCEPT · SYNTHETIC DATA · NOT CONNECTED` marker in every screen header. Never show an unlabeled metric, approval, incident, driver, vehicle, booking, or route as real.
- Use a shared location view that distinguishes the sourced Angeles City boundary, proposed synthetic TODA polygons, terminal markers, and driver/booking locations. A visual proposal is not a permit or an approved service area.
- Build the concepts as local mock modules only if later implementation is requested. They require no backend, API, account, or dependency for this Android POC.

## Concept navigation

| Role | Navigation areas | Primary work surface |
| --- | --- | --- |
| TODA administrator | Overview, Drivers, Vehicles, Queue, Service zones, Trips, Incidents, Settings | Terminal queue and registry workspace |
| Dispatcher / operations | Live board, Bookings, Drivers, Map, Exceptions, Activity | Dispatch board with lifecycle filters and map |
| LGU / city administrator | Overview, Registry review, Zone proposals, Fare proposals, Incidents, Reports, Audit | Review workspace with separate boundary and proposal layers |
| Platform administrator | System overview, Roles, Demo data, Map providers, Simulation, Audit | Configuration and health workspace |

## TODA administrator

### Overview

Show synthetic driver eligibility, shift state, queue length, and trip summaries as clearly labeled sample cards. Use `—` for unconfigured values instead of inventing counts. Below the cards, show the queue and pending review lists with provenance and “sample only” chips.

### Drivers and vehicles

Use a searchable table on wide layouts and expandable driver cards on narrow layouts. Driver rows can display a synthetic name, sample TODA ID, body number, demo eligibility, shift state, and a review status such as `Sample profile`. Vehicle records are concepts until an operator enters verified data in a real system.

### Queue and service zones

Display FIFO order, the synthetic eligibility rule, and a map legend. Zone editing is a draft proposal in this concept. Provide visible actions for “Preview proposal” and “Save local draft”; do not imply that either action changes a legal operating zone.

### Trips and incidents

Use synthetic completed-trip summaries and labeled example incident cards. Avoid real passenger identifiers, precise home locations, or claims of recorded incidents. Show trip outcome, approximate demo distance, synthetic fare, and the retained audit event in the concept.

## Dispatcher / operations staff

### Live board

Use three columns on wide screens: waiting requests, active offers, and assigned trips. Each card shows its demo lifecycle state, pickup and destination labels, synthetic coverage result, offer countdown, assigned demo driver, and route source. On narrow screens, collapse the columns into labeled tabs with counts marked `sample`.

### Dispatch map and exceptions

Keep the map beside the request list on wide screens and above it on phones. Show only simulated driver positions and demo bookings. Exception cards may illustrate declined offers, expired offers, no eligible driver, or a route leaving configured demo coverage. Label each as an example scenario, never an operational alert.

### Lifecycle and activity

Provide a read-only event timeline for request, offer, accept/decline, approach, arrival, trip start, completion, and cancellation. Controls in a concept mock should be non-destructive placeholders unless they are connected to the existing local demo reducer.

## LGU / city administrator

### Overview and registries

Show sections for the sourced city boundary, TODA registry review, driver/vehicle registry concepts, and compliance-report drafts. Separate submitted material from reviewed material; use statuses such as `Concept`, `Sample submission`, and `Needs human review`.

### Zone and route review

Use a split map-and-review layout. Render the administrative boundary as its own source-backed layer and proposed TODA zones/routes as a separate dashed layer. Proposal cards record submitter, revision, geometry source, and review status. Do not provide an “approved” state as prefilled sample data.

### Fare, incidents, reports, and audit

Represent fare settings as proposals that need an authorized reviewer. Incident cards and analytics remain synthetic examples. Reports should state their sample period and source. Audit history is a concept for future integration, not proof that this POC records government actions.

## Platform administrator

### System overview

Use neutral health cards for app version, map tile availability, local simulation state, and configured providers. Values that cannot be observed should say `Not configured` or `Not measured`; do not fabricate uptime, request volume, or provider SLAs.

### Roles, demo data, and simulation

Show role definitions and demo fixture controls as configuration concepts. Make clear that the current Android POC uses a local reducer and synthetic profiles. It does not provide user provisioning, access control, a production audit log, or remote demo-data management.

### Map providers and audit

List the provider name, attribution requirement, and runtime availability only when actually observed. Keep configuration changes separate from runtime health. The concept must not imply that a public tile or routing endpoint is guaranteed.

## Handoff boundary

These screens are planning artifacts only. Before building a staff portal, agree on the operator, authoritative data owner, identity/access model, legal review, retention policy, audit requirements, and service boundary. The present Android POC can continue to run without these concepts or any new backend.
