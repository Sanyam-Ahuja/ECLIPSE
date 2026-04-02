# Phase 5 — Consumer Web App (Next.js): DETAILED EXECUTION PLAN

**Goal:** Full Next.js consumer experience — login → submit .blend/train.py → watch live detection → monitor chunks → download results.

---

## Project Setup

### 1. Next.js Initialization

```bash
npx -y create-next-app@latest ./web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Additional dependencies:**
```bash
npm install next-auth @auth/core                # Auth
npm install zustand                              # State management
npm install recharts                             # Training curves
npm install react-dropzone                       # File upload
npm install framer-motion                        # Animations
npm install lucide-react                         # Icons
npm install clsx tailwind-merge                  # Utility
npm install @tanstack/react-query                # Server state
```

### 2. Design System (`web/app/globals.css` + `tailwind.config.ts`)

**Color palette — Dark theme with neon accents:**
```
Background:  #0a0a0f (near-black)
Surface:     #12121a (card backgrounds)
Border:      #1e1e2e (subtle borders)
Primary:     #6366f1 (indigo — main actions)
Secondary:   #8b5cf6 (violet — accents)
Success:     #22c55e (green — completion/online)
Warning:     #eab308 (yellow — pause/warning)  
Danger:      #ef4444 (red — failure/offline)
Text:        #e2e8f0 (light grey)
Text muted:  #64748b (mid grey)
Glow:        0 0 20px rgba(99,102,241,0.3) (indigo glow for glassmorphism)
```

**Typography:** Inter (Google Fonts) — clean, modern sans-serif.

**Design tokens:**
- Cards: `bg-surface/80 backdrop-blur-xl border border-border rounded-2xl`
- Glassmorphism: `bg-white/5 backdrop-blur-md border border-white/10`
- Buttons: gradient backgrounds with hover scale animations
- Status dots: pulsing colored dots for online/busy/offline

---

## Auth Flow

### 3. NextAuth.js Configuration (`web/lib/auth.ts` + `web/app/api/auth/[...nextauth]/route.ts`)

**`web/lib/auth.ts`:**
```typescript
// NextAuth config with Google provider
// On sign-in: exchange Google token with our FastAPI backend
//   POST /api/v1/auth/google { google_token } → { jwt, user }
// Store our JWT in NextAuth session for API calls
// Session includes: user.id, user.email, user.name, user.role, our_jwt
```

**`web/app/api/auth/[...nextauth]/route.ts`:**
```typescript
// NextAuth route handler
// Providers: [Google]
// Callbacks:
//   signIn: verify with backend, get our JWT
//   session: attach our JWT to session
//   jwt: persist our JWT in NextAuth JWT
```

**Auth guard (`web/app/(app)/layout.tsx`):**
```typescript
// Check session on every (app) route
// If not authenticated → redirect to /login
// If authenticated → render children with sidebar layout
```

---

## Layout & Navigation

### 4. App Layout (`web/app/(app)/layout.tsx`)

```
┌─────────────────────────────────────────────┐
│ ┌───────┐ ┌─────────────────────────────────┐│
│ │       │ │                                 ││
│ │ Side  │ │         Main Content            ││
│ │ bar   │ │                                 ││
│ │       │ │         (page.tsx)              ││
│ │ □ Dash│ │                                 ││
│ │ □ Sub │ │                                 ││
│ │ □ Mon │ │                                 ││
│ │ □ Res │ │                                 ││
│ │ □ Bill│ │                                 ││
│ │       │ │                                 ││
│ │───────│ │                                 ││
│ │ User  │ │                                 ││
│ │ Avatar│ │                                 ││
│ └───────┘ └─────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Sidebar:** Glassmorphism panel, width 260px, collapsible to icon-only (64px) on mobile.
- Logo + wordmark at top
- Nav items with icons: Dashboard, Submit, Monitor, Results, Billing
- Active item has indigo background glow
- User avatar + name at bottom with sign-out

---

## Pages

### 5. Dashboard (`web/app/(app)/dashboard/page.tsx`)

**Purpose:** Overview of all user's jobs.

**Components:**
- `StatsRow` — 4 stat cards in a row:
  - Total Jobs (number, all time)
  - Active Jobs (number, currently running)
  - GPU Hours Used (total consumed)
  - Credits Remaining (balance)
- `RecentJobs` — table/card list:
  - Job name (first uploaded filename)
  - Type (render/ML/data/sim) with colored badge
  - Status (analyzing/queued/running/completed/failed) with colored badge + progress bar
  - Submitted time (relative: "3 hours ago")
  - Cost (in credits or $)
  - Actions: View, Cancel, Download
- `QuickSubmit` — small drag-drop zone linking to /submit

**Data fetching:** `@tanstack/react-query` with `GET /api/v1/jobs?page=1&limit=20`

---

### 6. Submit Page (`web/app/(app)/submit/page.tsx`) — THE KEY USER EXPERIENCE

**Purpose:** Drag-drop upload → watch AI detect → confirm → dispatch.

**Components:**

#### `FileDropzone.tsx`
```typescript
// react-dropzone based
// Large centered zone: "Drop your files here"
// Accepts: .blend, .py, .csv, .parquet, .zip, .tar.gz, etc.
// Shows upload progress bar during multipart upload
// On upload complete: triggers pipeline → switches to DetectionStream
```

#### `DetectionStream.tsx` — Live Pipeline Animation
```typescript
// WebSocket connection to /api/v1/ws/job/{jobId}
// Receives pipeline step messages and animates them:
//
// ┌─────────────────────────────────────────┐
// │ ● Reading file format...        ✓ Done  │  (step 1)
// │ ● Detected: Blender scene       ✓ Done  │  (step 1 result)
// │ ● Parsing render settings...    ✓ Done  │  (step 2)
// │ ● Frame range: 1-300, Cycles    ✓ Done  │  (step 2 result)
// │ ● Selecting container image...  ✓ Done  │  (step 3)
// │ ◐ Estimating resources...       ⏳ ...   │  (step 4, in progress)
// └─────────────────────────────────────────┘
//
// Each step animates in with framer-motion (fade up + slide)
// Spinner on current step, checkmark on completed
// If a step fails: red X + error message
```

#### `JobProfileCard.tsx` — Detected Job Summary
```typescript
// Shown after detection completes:
// ┌──────────────────────────────────────────────┐
// │  📦 Job Profile                    ✏️ Edit   │
// │                                              │
// │  Type:        3D Rendering (Blender)         │
// │  Renderer:    Cycles (GPU)                   │
// │  Frames:      1 - 300                        │
// │  Chunks:      4 × 75 frames                  │
// │  Image:       campugrid/blender:4.1-cycles   │
// │  Est. Time:   ~47 minutes                    │
// │  Confidence:  96%  ████████████░░  │
// │                                              │
// │  ┌────────────────────────────────────────┐  │
// │  │  💰 Price Comparison                   │  │
// │  │                                        │  │
// │  │  Google Colab Pro    $2.44             │  │
// │  │  AWS p3.2xl          $12.24            │  │
// │  │  RunPod              $1.76             │  │
// │  │  CampuGrid           $1.92  ← you     │  │
// │  │                                        │  │
// │  │  You save 68% vs Colab, 84% vs AWS    │  │
// │  └────────────────────────────────────────┘  │
// │                                              │
// │  For ML jobs: sync mode selector             │
// │  ○ Standard (Local SGD) - $1.92              │
// │  ○ Premium (DDP, LAN only) - $2.88           │
// │                                              │
// │           [ Cancel ]    [ 🚀 Launch Job ]    │
// └──────────────────────────────────────────────┘
//
// If confidence < 80%: edit mode auto-opens, user can correct:
//   - Workload type dropdown
//   - Framework override
//   - Resource requirements sliders
```

#### `PriceComparison.tsx`
```typescript
// Animated bar chart comparing CampuGrid price to competitors
// Data from GPU_BENCHMARKS + dynamic pricing
// Green highlight on CampuGrid row
// "You save X%" callout
```

---

### 7. Monitor Page (`web/app/(app)/monitor/[jobId]/page.tsx`)

**Purpose:** Real-time chunk-by-chunk monitoring.

**Components:**

#### `JobHeader.tsx`
```typescript
// Job name, type badge, overall status, overall progress bar
// Total chunks: 4, Completed: 2, Running: 1, Pending: 1
// Elapsed time, estimated remaining
```

#### `ChunkCard.tsx` — Per-Chunk Live Card
```typescript
// ┌────────────────────────────────────────┐
// │ Chunk #1/4                   ✅ Done   │
// │ Node: #7 • RTX 3070 • Mumbai          │
// │ ████████████████████████████ 100%     │
// │ Frames: 1-75 • 12 min                 │
// ├────────────────────────────────────────┤
// │ Chunk #2/4                   🔄 Running│
// │ Node: #12 • RTX 4060 • Delhi          │
// │ ██████████████░░░░░░░░░░░░░  56%      │
// │ Frame 42/75 • GPU: 94% • Temp: 72°C  │
// │ ▁▂▃▅▆▇█▇▆▅ GPU utilization graph      │
// ├────────────────────────────────────────┤
// │ Chunk #3/4                   ⚠️ Rescued│
// │ Was: Node #3 (went offline)           │ (red flash animation)
// │ → Reassigned to Node #15             │ (green slide-in)
// │ Resuming from checkpoint step 450     │
// │ ████████░░░░░░░░░░░░░░░░░░░  32%     │
// ├────────────────────────────────────────┤
// │ Chunk #4/4                   ⏳ Queued │
// │ Waiting for available node...         │
// └────────────────────────────────────────┘
//
// WebSocket updates: status changes, progress %, GPU stats every 10s
// Chunk rescue: card animates from red border → "Reassigning..." → green border with new node
// This is the most visually impressive page — shows fault tolerance in real time
```

#### `GpuUtilizationBar.tsx`
```typescript
// Animated horizontal bar showing real-time GPU utilization %
// Color: green < 70%, yellow 70-90%, red > 90%
// Mini sparkline chart showing GPU usage over last 60s
```

---

### 8. Results Page (`web/app/(app)/results/[jobId]/page.tsx`)

**Purpose:** Download completed job outputs.

**Components:**

#### For Rendering:
```typescript
// Inline video preview (HTML5 <video> player)
// Download button: output.mp4
// Frame gallery: thumbnail grid of individual frames
// Job stats: duration, GPU-hours, cost
```

#### For ML Training:
```typescript
// TrainingCurve.tsx — Recharts line chart:
//   X-axis: epoch/step, Y-axis: loss
//   Multiple lines if multi-node (shows convergence)
// Download model weights: final_model.pt
// Download training logs
// Model summary: params count, final loss, accuracy (if classification)
```

#### For Data Processing:
```typescript
// File download: result.csv / result.parquet
// Preview: first 50 rows in a data table
// Stats: input size, output size, processing time
```

---

### 9. Billing Page (`web/app/(app)/billing/page.tsx`)

**Purpose:** Credits balance, usage history, pricing info.

**Components:**
```typescript
// Credit balance card (prominent, top of page)
// Usage chart: credits spent per day (Recharts bar chart, last 30 days)
// Transaction history table:
//   - Job name, type, GPU-hours, cost, date
//   - Sortable, paginated
// "Earn credits" CTA → link to download contributor app
```

---

## Shared Components & Hooks

### 10. `web/lib/ws.ts` — WebSocket Hook

```typescript
export function useWebSocket(url: string, onMessage: (data: any) => void) {
    // useEffect: connect to WebSocket on mount
    // Auto-reconnect on disconnect (exponential backoff)
    // Parse JSON messages → call onMessage callback
    // Return: { connected, send, disconnect }
}

export function useJobStream(jobId: string) {
    // Specific hook: connects to /api/v1/ws/job/{jobId}
    // Returns: { status, chunks, events }
    // Updates in real-time as WS messages arrive
}
```

### 11. `web/lib/api.ts` — REST API Client

```typescript
class CampuGridAPI {
    private baseUrl: string;
    private token: string;
    
    async submitJob(files: File[], options?: { mlSyncMode?: string }): Promise<{ jobId: string }>
    async getJob(jobId: string): Promise<Job>
    async getJobs(page: number, limit: number): Promise<PaginatedResponse<Job>>
    async cancelJob(jobId: string): Promise<void>
    async getEstimate(gpuTier: string, hours: number): Promise<PriceEstimate>
    async getEarnings(): Promise<EarningsSummary>
    async getBillingHistory(page: number): Promise<PaginatedResponse<BillingRecord>>
    async getClusterStats(): Promise<ClusterStats>
}
```

---

## Phase 5 Completion Test

**End-to-end browser test:**
1. Open web app → redirected to login
2. Sign in with Google → redirected to dashboard
3. Dashboard shows empty state ("No jobs yet, submit your first!")
4. Navigate to Submit → drag .blend file
5. Upload progress bar → detection stream animates
6. Job profile card appears with price comparison
7. Click "Launch Job" → redirected to Monitor page
8. Chunk cards appear, GPU bars animate
9. (Simulate node failure) → chunk card flashes red → "Reassigning..." → new node
10. All chunks complete → "Assembling..." → "Complete!"
11. Navigate to Results → video preview plays inline
12. Download video → verify it's correct
13. Billing page shows the job charge
