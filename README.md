
1 — Executive summary (what we’ll build)
	•	Product: Desktop-first chat app (Electron) with parity features to WhatsApp v1: 1:1 chat, groups, presence, typing, read receipts, media (images/audio), offline storage & sync, end-to-end encryption as a roadmap item.
	•	Tech stack:
	•	Desktop shell: Electron (main process runs sync & local DB)
	•	UI: React with Relay (GraphQL client)
	•	Backend GraphQL: Node.js (GraphQL server with support for queries/mutations/subscriptions — e.g., Apollo Server or GraphQL Yoga + graphql-ws)
	•	Real-time: GraphQL Subscriptions over WebSocket (server), fallback to socket.io if needed
	•	ORM: Prisma (SQLite for local, Postgres for server)
	•	Local-first cache: SQLite (Prisma client in Electron main), app sync with server (via GraphQL subscriptions + mutation reconciliation)
	•	Storage for media: Server-side object storage (S3-compatible)
	•	Authentication: JWT for session; contact verification via phone number + OTP (or email for non-phone)
	•	Key nonfunctional goals: low latency messaging, offline-first resilience, modular (feature packages), secure by design (E2EE later), scalable server with Postgres + horizontal WebSocket scaled with Redis pub/sub.

⸻

2 — High-level architecture & tradeoffs
	•	Single GraphQL schema used by Relay frontend and server. Relay expects a stable schema & pagination patterns (connections).
	•	Why Relay: optimal for large client-side data graphs & normalized cache. Must design server with cursor-based pagination and mutations returning updated record payloads per Relay conventions.
	•	Why Prisma: Type-safety, dev DX, works with SQLite (local) & Postgres (server) — same schema with different providers.
	•	Realtime: Use GraphQL subscriptions (graphql-ws) for a unified GraphQL UX. If scaling needs force it, place a messaging queue (Redis Pub/Sub) to distribute events between server nodes.
	•	Local-first: Electron keeps local DB to read instantly; writes are written locally then synced to server. This means HA reconcilers: optimistic UI + server authoritative final state.
	•	E2EE: Non-trivial (Signal protocol). MVP: transport-level encryption (TLS) + server-side encrypted storage. Roadmap: implement Signal protocol (or libsignal) for message encryption — requires key management + device linking.

Tradeoffs:
	•	Electron = heavier binary, faster time-to-market and dev ecosystem. Tauri would’ve been lighter but we pick Electron per your request.
	•	Relay increases server work (Relay conventions) but pays off in performance and caching for a chat client.

⸻

3 — Feature-driven development (FDD) plan (high level)

Prioritize minimum set to ship v1 in sprints:

Sprint 0 (setup)
	•	Monorepo, CI, base Electron + React + Relay shell, GraphQL server skeleton, Prisma Postgres + local SQLite setup, auth skeleton.

Sprint 1 (Core messaging v1)
	•	Phone/email auth + contacts
	•	1:1 messaging (text), send/receive, read receipts, typing indicator, presence
	•	Local storage & sync basic (optimistic writes, websocket subscription)
	•	Read/Unread counters, conversation list UI

Sprint 2 (Media + groups)
	•	Media upload/download, thumbnails, progress
	•	Group chats (create, invite, admin, mute)
	•	Message deletion for me vs everyone (server side)

Sprint 3 (Polish & scale)
	•	Pagination of messages (Relay connections), search, notifications, desktop notifications
	•	Sync fixes, conflict resolution
	•	Monitoring, metrics (latency, message delivery rate), rate limits

Sprint 4 (Security & E2EE)
	•	Plan & prototype E2EE using libsignal.
	•	Key backup & device linking UX.

Each feature has its feature list and acceptance tests (below).

⸻

4 — Concrete monorepo folder structure (opinionated, pnpm workspaces)

/repo
├─ package.json (workspaces)
├─ pnpm-workspace.yaml
├─ apps/
│  ├─ electron-app/                # Electron shell + renderer (React/Relay)
│  │  ├─ src/
│  │  │  ├─ main/                  # Electron main process (sync, DB access)
│  │  │  └─ renderer/              # React + Relay app
│  │  └─ build/
│  └─ web-app/                      # (optional) browser version using same UI components
├─ packages/
│  ├─ ui/                          # shared React components (Button, List, MessageBubble)
│  ├─ schema/                      # GraphQL schema + graphql fragments for Relay
│  ├─ graphql-server/              # GraphQL server (Node.js)
│  │  ├─ src/
│  │  │  ├─ schema/
│  │  │  ├─ resolvers/
│  │  │  ├─ subscriptions/
│  │  │  └─ index.ts
│  ├─ prisma/                      # Prisma schema + migrations for server DB
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  ├─ prisma-local/                # Prisma schema for local SQLite (can be same schema but different provider)
│  ├─ sync-worker/                 # sync logic (reconciliation between local & server)
│  └─ utils/                       # helpers used across services (media, auth, validators)
├─ infra/
│  ├─ docker-compose.yml
│  ├─ k8s/                         # Kubernetes manifests (if using k8s)
│  └─ terraform/                   # infra as code
└─ tests/
   ├─ e2e/                         # Playwright/Cypress tests (UI flows)
   ├─ integration/                 # backend integration tests
   └─ unit/

Notes:
	•	Electron main process owns the local Prisma client (SQLite). Renderer interacts with main via secure IPC (contextBridge) for DB ops or sends GraphQL operations directly to server using Relay (prefer latter for consistency; local-only operations use IPC).
	•	Use shared schema/ package to generate types and Relay artifacts.

⸻

5 — Prisma data model (starter) — packages/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // for server. For Electron local use "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  phoneNumber   String?   @unique
  email         String?   @unique
  name          String?
  avatarUrl     String?
  devices       Device[]
  contacts      Contact[] // user contacts imported
  conversations ConversationMember[]
  messagesSent  Message[] @relation("sender")
  createdAt     DateTime  @default(now())
}

model Device {
  id           String   @id @default(cuid())
  user         User     @relation(fields: [userId], references: [id])
  userId       String
  publicKey    String?  // for E2EE future
  lastSeenAt   DateTime?
  createdAt    DateTime @default(now())
}

model Conversation {
  id            String        @id @default(cuid())
  title         String?
  isGroup       Boolean       @default(false)
  members       ConversationMember[]
  messages      Message[]     @orderBy([createdAt])
  lastMessageAt DateTime?
  createdAt     DateTime      @default(now())
}

model ConversationMember {
  id             String       @id @default(cuid())
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  conversationId String
  user           User         @relation(fields: [userId], references: [id])
  userId         String
  isAdmin        Boolean      @default(false)
  mutedUntil     DateTime?
  joinedAt       DateTime     @default(now())
}

model Message {
  id             String      @id @default(cuid())
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  conversationId String
  sender         User?       @relation("sender", fields: [senderId], references: [id])
  senderId       String?
  body           String?
  mediaUrl       String?
  mediaType      String?     // image/audio/video
  status         MessageStatus @default(SENT)
  replyToId      String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime?   
  deliveredTo    Delivered[] 
  readBy         ReadReceipt[]
}

model ReadReceipt {
  id        String   @id @default(cuid())
  message   Message  @relation(fields: [messageId], references: [id])
  messageId String
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  readAt    DateTime @default(now())
}

model Delivered {
  id        String  @id @default(cuid())
  message   Message @relation(fields: [messageId], references: [id])
  messageId String
  user      User    @relation(fields: [userId], references: [id])
  userId    String
  deliveredAt DateTime @default(now())
}

model Contact {
  id        String @id @default(cuid())
  owner     User   @relation(fields: [ownerId], references: [id])
  ownerId   String
  contactId String? // if contact is app user
  name      String?
  phone     String
}
enum MessageStatus {
  SENT
  DELIVERED
  READ
  DELETED
}

Notes:
	•	Delivered and ReadReceipt allow per-device/per-user tracking and can be optimized later.
	•	For Relay you’ll add connection types on the GraphQL server (messageConnection).

⸻

6 — GraphQL schema & Relay considerations (high-level)
	•	Use Relay-compliant patterns:
	•	Cursor-based pagination per conversation: messages(first: Int, after: String): MessageConnection.
	•	Mutations must return edge or updated nodes so Relay can update local store.
	•	Example mutation return pattern:

mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    messageEdge {
      cursor
      node {
        id
        body
        createdAt
        sender { id name }
      }
    }
    conversation {
      id
      lastMessageAt
    }
  }
}

	•	Subscriptions:
	•	messageAdded(conversationId: ID!): Message
	•	presenceUpdated(userId: ID!, status: Presence)
	•	Use Relay Compiler prebuild step to generate artifacts for the renderer.

⸻

7 — Data flow diagrams (Mermaid) — copy into a markdown-enabled renderer that supports mermaid.

7.1 System-level dataflow

flowchart LR
  A[Electron Renderer (Relay)] -->|GraphQL Mutations/Queries| B[GraphQL Server]
  B --> C[Postgres DB via Prisma]
  B --> D[Storage (S3)]
  B --> E[Pub/Sub (Redis) for scale]
  E --> B
  subgraph Local
    F[Electron Main] -->|Prisma SQLite| G[Local SQLite]
    A -->|IPC| F
    F -->|Sync (WebSocket)| B
  end
  B -->|Subscriptions| A

7.2 Sequence: sending a message (optimistic)

sequenceDiagram
  participant U as User (Renderer)
  participant M as Electron Main (Local DB)
  participant S as GraphQL Server
  participant DB as Postgres
  U->>M: write message locally (optimistic) -> SQLite
  U->>S: sendMessage mutation (via Relay)
  S->>DB: store message, set status SENT
  S->>S: publish messageAdded (Redis pub/sub if scaled)
  S->>U: subscription push messageConfirmed (contains server id, timestamps)
  U->>M: reconcile local message id <-> server id; update status


⸻

8 — User journeys + acceptance tests (top priority flows)

For each journey: goal, steps, acceptance criteria, test cases.

8.1 Onboarding (Auth with phone/email)
	•	Steps:
	1.	User enters phone/email.
	2.	System sends OTP.
	3.	User enters OTP; server verifies, creates User and Device entry.
	4.	Client stores JWT & device id locally.
	•	Acceptance:
	•	OTP delivery within X seconds (SLA).
	•	Creating User returns userId & deviceId.
	•	Local DB stores user and device record.
	•	Tests:
	•	Unit: validate OTP generation/verification logic.
	•	Integration: full flow with mock SMS provider.
	•	E2E: UI flow enters OTP and lands on Conversations list.

8.2 1:1 Messaging (text)
	•	Steps:
	1.	Open conversation -> load last N messages (Relay connection).
	2.	Type message -> press send.
	3.	Message appears optimistically, status = SENT locally.
	4.	Server responds and subscription confirms -> status updated to DELIVERED when recipient device acknowledges, READ when recipient opens.
	•	Acceptance:
	•	Message visible instantly after send (optimistic).
	•	Message unique id mapping reconciled after server ack.
	•	Read receipts update in <= 5 sec when recipient opens.
	•	Tests:
	•	Unit: message serializer, local write logic.
	•	Integration: sender and recipient simulated sessions with subscription events.
	•	E2E: send message and assert delivered/read status flows.

8.3 Group Chat
	•	Steps:
	1.	Create group with members.
	2.	Send messages; ensure all members receive.
	3.	Admin actions: add/remove members.
	•	Acceptance:
	•	Message delivered to group members subscribed.
	•	Adding member syncs to server & local lists.
	•	Tests:
	•	Integration test: create group, add members, broadcast message via pub/sub.

8.4 Media Send (image)
	•	Steps:
	1.	User selects image, client uploads to server (S3) chunked if big.
	2.	On success server returns mediaUrl.
	3.	Send message referencing mediaUrl.
	•	Acceptance:
	•	Upload resumable for larger files.
	•	Thumbnail generated server-side.
	•	UI shows upload progress and fallback on failure.
	•	Tests:
	•	Unit: media uploader logic; chunking/resume.
	•	Integration: object storage emulator.

8.5 Offline send & sync
	•	Steps:
	1.	User sends messages while offline: messages are stored locally with status=QUEUED.
	2.	On reconnect, sync-worker posts queued messages to server and reconciles.
	•	Acceptance:
	•	Messages queued and persisted across app restarts.
	•	On network restore, messages sync automatically and status updates.
	•	Tests:
	•	Integration: mock network down/up and validate queue flush behavior.

⸻

9 — Testing strategy (detailed)
	•	Unit tests: Jest for server and client logic. Target >90% coverage for core modules (sync, message processing).
	•	Integration tests: run GraphQL server with test DB (Docker Postgres), use test harness to run subscriptions and verify events.
	•	Relay tests: use relay-test-utils to validate store updates.
	•	E2E tests: Playwright or Cypress for user flows (login, send message, media).
	•	Load tests: k6 or Locust to simulate message throughput and connection churn (scale WebSocket).
	•	Security tests: SAST, dependency scanning, pen-test of auth flows.

CI:
	•	On PR: run lint, unit tests, relay-compiler, typecheck, prisma migrate dev check.
	•	Nightly: run integration & E2E smoke tests.

⸻

10 — SDLC: phases & deliverables
	1.	Requirements & Discovery
	•	Stakeholders: PM, Designer, Eng lead, Security.
	•	Deliverables: PRD, success metrics (DAU, message latency <200ms median), user stories.
	2.	Design
	•	Deliverables: UI mockups, component library, data model, GraphQL schema draft, API contracts for Relay.
	3.	Implementation (iterative sprints)
	•	Sprint artifacts: tasks, acceptance criteria, PR reviews, feature flags for new capabilities.
	4.	Testing
	•	Unit/integration/E2E coverage plan, test matrices per OS (Win/mac/linux).
	5.	Release
	•	Desktop distribution: Electron builders for each platform, code signing, auto-updates (Squirrel / Electron Updater)
	•	Release channels: alpha, beta, stable.
	6.	Monitor & Operate
	•	Logs: structured logs to ELK or hosted (Datadog). Metrics: delivery latency, failed sync rate, active connections.
	•	Alerts: errors > threshold, SLO breaches.
	7.	Security & Compliance
	•	TLS everywhere, secrets in vault, rate limiting, brute-force protection.
	•	GDPR compliance: data deletion workflows.
	8.	Maintenance
	•	Backups, migrations, data retention policies.

⸻

11 — Operational/Infra plan
	•	Server:
	•	API nodes stateless, behind LB.
	•	WebSocket gateway with sticky sessions (or use Redis to route events).
	•	Postgres managed (e.g., RDS) with read replicas for analytics.
	•	Redis for pub/sub + caching.
	•	S3 for media; CDN for delivery.
	•	Scaling:
	•	Use horizontal scaling for GraphQL servers.
	•	Use Redis pub/sub to fan-out subscription events across server nodes.
	•	Backups/DR:
	•	Postgres daily backups, point-in-time recovery.
	•	Deploy:
	•	Docker images, Kubernetes/Cloud Run.

⸻

12 — Security & privacy (critical)
	•	Transport: TLS for all traffic.
	•	Auth: JWTs with refresh tokens, device binding.
	•	Storage: encrypt at rest server-side; encrypt local DB (SQLite encryption extension).
	•	E2EE plan:
	•	Roadmap stage: implement Signal protocol using libsignal for message encryption.
	•	Tradeoffs: E2EE breaks server-side search, backup complexity, group management complexity.
	•	Rate limiting and abuse detection.
	•	Contact import: hash phone numbers on server or perform client-side hashing to avoid leaking contacts.

⸻

13 — Example Relay + Electron integration notes
	•	Relay environment in renderer pointed at GraphQL server for most operations.
	•	For local queries (local DB read), either:
	•	Expose a small local GraphQL over IPC or
	•	Use direct IPC methods to query local prisma and hydrate Relay store manually.
	•	Strategy: primary reads from local DB for low-latency; Relay store kept in sync via subscription and local reconciliation routines.

⸻

14 — Concrete dev tasks (first 2 weeks roadmap)

Week 0:
	•	Setup monorepo, CI, lint, typescript config, pnpm.
	•	Create schema/ package and basic GraphQL types.
Week 1:
	•	Scaffold GraphQL server with Prisma Postgres connection.
	•	Scaffold Electron app with renderer React + Relay environment (relay-compiler running).
	•	Implement auth flow (OTP or dev stub).
Week 2:
	•	Implement sending/receiving text messages: mutation, subscription, local SQLite write, optimistic UI.
	•	Integration test for message flow.

⸻

15 — Sample acceptance tests (BDD style) — a few examples

Feature: Send a text message (1:1)

Scenario: User sends a text message and receiver gets it
Given Alice and Bob are registered users
And Alice and Bob are both online and connected to the WebSocket
When Alice composes "Hi Bob" and presses send
Then Alice sees the message immediately in her UI with a temporary local id
And the server stores the message and returns a server id
And the client reconciles local id to server id
And Bob receives the message via subscription within 2 seconds

Feature: Offline message queue

Scenario: Send while offline then auto-sync
Given Alice is offline
When Alice sends 3 messages
Then messages are stored locally with status QUEUED
When Alice regains network
Then messages are posted to server and status changed to SENT/DELIVERED


⸻

16 — Deliverables I can produce next (pick)

I can produce any of these immediately — pick one and I’ll deliver:
	•	A. Full repo scaffolding commands + sample package.jsons and pnpm workspace files.
	•	B. Full GraphQL schema file (SDL) compatible with Relay and server resolvers skeleton.
	•	C. Electron main + renderer starter code (TS) showing local Prisma usage, IPC, and Relay environment.
	•	D. Detailed k8s + infra terraform snippet for deployment.
	•	E. Prototype sequence diagrams and a clickable checklist for sprint 1 execution.

I recommend B + C as the next immediate pieces to ship core messaging quickly.
