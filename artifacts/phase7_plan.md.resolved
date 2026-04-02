# Phase 7 — Marketing Site + Polish: DETAILED EXECUTION PLAN

**Goal:** Product website that sells the vision. E2E tests. Performance validation. Docs. Error tracking.

---

## Marketing Pages (`web/app/(marketing)/`)

### 1. Marketing Layout (`web/app/(marketing)/layout.tsx`)

```typescript
// Distinct from app layout — no sidebar, public pages
// ┌──────────────────────────────────────────┐
// │  Logo    Features  Pricing  About  [CTA] │  Sticky transparent navbar
// ├──────────────────────────────────────────┤
// │                                          │
// │            Page Content                  │
// │                                          │
// ├──────────────────────────────────────────┤
// │  Footer: Links, Social, Copyright        │
// └──────────────────────────────────────────┘
//
// Navbar: transparent on top, blurs to glassmorphism on scroll
// CTA button: "Get Started" → /login (consumer) or "Start Earning" → /download (contributor)
```

### 2. Landing Page (`web/app/(marketing)/page.tsx`) — THE SALES PAGE

**Section 1: Hero**
```
┌──────────────────────────────────────────────┐
│                                              │
│  Turn Idle GPUs Into                         │
│  Campus Supercomputers                       │
│                                              │
│  Drop your ML script or .blend file.         │
│  We split, distribute, render, and return.   │
│  No Docker. No cloud. No config.             │
│                                              │
│  [ 🚀 Submit a Job ]  [ 💰 Start Earning ]  │
│                                              │
│  ┌────────────────────────────────────┐      │
│  │  Animated visualization:           │      │
│  │  GPU particles flowing from        │      │
│  │  laptop icons into a central       │      │
│  │  processing cluster, results       │      │
│  │  flowing back out                  │      │
│  └────────────────────────────────────┘      │
│                                              │
│  "500M+ idle GPUs worldwide. We connect      │
│   the ones on your campus."                  │
└──────────────────────────────────────────────┘
```

**Hero animation:** CSS/Canvas animation showing:
- Multiple laptop icons with GPU labels
- Glowing particles streaming from laptops toward center
- Center: pulsing compute node visualization
- Particles stream back to a "Results" node
- Subtle grid background with scan lines

**Section 2: Three Problem Cards**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  🧠 ML Cost  │ │  🎨 Render   │ │  💤 Idle     │
│              │ │  Time        │ │  Hardware    │
│  Colab:      │ │  40 hours    │ │  70% idle    │
│  $4.10/hr    │ │  for 300     │ │  across     │
│  for A100    │ │  frames on   │ │  campus.    │
│              │ │  a laptop    │ │  Already    │
│  Students    │ │              │ │  paid for.  │
│  can't       │ │  Students    │ │              │
│  afford it.  │ │  submit      │ │  Not being  │
│              │ │  low-quality │ │  used.      │
│              │ │  work.       │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Section 3: How It Works (4 steps)**
```
┌─────────────────────────────────────────────┐
│  How CampuGrid Works                        │
│                                              │
│  ①  Upload     →  ②  AI Detects            │
│  Drop your        Auto-identifies           │
│  file              framework, splits         │
│                    into chunks               │
│                                              │
│  ③  Distribute →  ④  Results                │
│  Chunks run        Assembled &               │
│  across idle       delivered.                │
│  campus GPUs       Fault-tolerant.           │
│                                              │
│  [ See it in action → ]                     │
└─────────────────────────────────────────────┘
```

Animated with Framer Motion: each step reveals on scroll, connecting arrows animate between them.

**Section 4: Live Cluster Stats**
```
┌─────────────────────────────────────────────┐
│  Right Now on CampuGrid                     │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  127    │ │  89     │ │  2,340  │       │
│  │  Active │ │  Jobs   │ │  GPU    │       │
│  │  Nodes  │ │  Today  │ │  Hours  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                              │
│  (Animated counter — numbers increment       │
│   from 0 on scroll into view)                │
└─────────────────────────────────────────────┘
```

Data from: `GET /api/v1/nodes/stats` (public endpoint, cached 60s)

**Section 5: Price Comparison**
```
┌─────────────────────────────────────────────┐
│  Save 50-84% vs Cloud                       │
│                                              │
│  For 4 GPU-hours of PyTorch training:       │
│                                              │
│  Google Colab Pro    ████████████  $2.44    │
│  AWS p3.2xl         ████████████████████ $12│
│  RunPod             ████████  $1.76         │
│  CampuGrid         ██████  $1.92           │  (highlighted green)
│                                              │
│  Fault-tolerant. Auto-split. Zero config.   │
└─────────────────────────────────────────────┘
```

**Section 6: For Contributors**
```
┌─────────────────────────────────────────────┐
│  Earn While Your GPU Sleeps                 │
│                                              │
│  RTX 3060:  ₹8,250/month   (10 hrs/day)    │
│  RTX 4060:  ₹12,600/month                  │
│  RTX 4090:  ₹57,000/month                  │
│                                              │
│  · Your machine stays safe (sandboxed)      │
│  · Set your own schedule                    │
│  · Earn credits or real money               │
│  · Campus leaderboard                       │
│                                              │
│  [ Download Contributor App ]               │
└─────────────────────────────────────────────┘
```

**Section 7: Final CTA**
```
┌─────────────────────────────────────────────┐
│                                              │
│  Ready to compute?                          │
│                                              │
│  [ 🚀 Submit Your First Job — It's Free ]  │
│                                              │
│  or  [ Start Earning → ]                    │
│                                              │
└─────────────────────────────────────────────┘
```

---

### 3. Pricing Page (`web/app/(marketing)/pricing/page.tsx`)

**Interactive pricing calculator:**
```
┌─────────────────────────────────────────────┐
│  Pricing Calculator                         │
│                                              │
│  Workload type:  [ML Training ▼]            │
│  GPU tier:       [RTX 3060    ▼]            │
│  Estimated hours: [4  ▼]                    │
│  ML sync mode:   ○ Standard  ○ Premium      │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │  Your estimate: $1.92               │    │
│  │                                     │    │
│  │  vs Colab:  $2.44  (save 21%)      │    │
│  │  vs AWS:    $12.24 (save 84%)      │    │
│  │  vs RunPod: $1.76  (8% more)       │    │
│  │                                     │    │
│  │  ⚡ Auto-split, fault-tolerant,     │    │
│  │     zero config included            │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  Contributor Earnings                       │
│  ─────────────────                          │
│  If you have an RTX 3060 and contribute     │
│  10 hours/day:                              │
│  · ₹275/day · ₹8,250/month                 │
│  · Net of electricity                       │
└─────────────────────────────────────────────┘
```

### 4. About Page (`web/app/(marketing)/about/page.tsx`)

- Team section (photos, roles)
- Mission statement
- Campus pilot info
- University partnership inquiry form

### 5. Docs Pages (`web/app/(marketing)/docs/`)

- Getting Started (consumer)
- Getting Started (contributor)
- Supported workload types
- API reference (generated from FastAPI OpenAPI spec)
- FAQ

---

## Animations (Framer Motion)

### 6. Animation Strategy

```typescript
// Use Intersection Observer + Framer Motion for scroll-triggered animations

// Reusable reveal wrapper:
function RevealOnScroll({ children, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            viewport={{ once: true, margin: "-100px" }}
        >
            {children}
        </motion.div>
    );
}

// Counter animation for stats:
function AnimatedCounter({ target, duration = 2 }) {
    // Animate from 0 to target using useMotionValue + useTransform
    // Triggers when scrolled into view
}

// Stagger children:
const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } }
};
const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};
```

**Key animations:**
- Hero: fade-in + scale on load
- Problem cards: stagger reveal on scroll
- How-it-works steps: sequential reveal with connecting line animation
- Stats counters: number counting animation
- Price comparison bars: width animation
- CTA: subtle pulse/glow

---

## E2E Testing

### 7. Critical Test Scenarios

**Test 1: Full Render Flow**
```
1. Login via browser
2. Navigate to Submit
3. Upload .blend file (10 frames)
4. Watch detection stream complete
5. Confirm job profile → Launch
6. Navigate to Monitor
7. Wait for all chunks to complete
8. Navigate to Results
9. Verify video plays
10. Download and verify file integrity
```

**Test 2: Fault Tolerance Demo**
```
1. Submit job with 4 chunks
2. Wait for 2 chunks to start running
3. Kill contributor daemon on one node
4. Verify watchdog rescues chunk (< 2 min)
5. Verify rescued chunk completes on another node
6. Verify final result is complete
```

**Test 3: ML Training Flow**
```
1. Submit PyTorch MNIST script + dataset
2. Select Standard (Local SGD)
3. Monitor training across 2 nodes
4. Verify training completes
5. Download model + verify training curve
```

**Test 4: Gemini Docker Adaptation**
```
1. Submit Python script importing `transformers` (not in catalog)
2. Verify Gemini Tier 2 triggers
3. Verify adapted image builds
4. Verify job runs with adapted image
```

**Test 5: Contributor App Flow**
```
1. Install Tauri app
2. First-run registration
3. Verify GPU detection
4. Contribute to a job
5. Verify earnings appear in dashboard
```

---

## Performance Testing

### 8. Benchmarks

```python
# 50 concurrent simulated nodes
# - Each sends heartbeat every 10s via WebSocket
# - Server handles 50 WebSocket connections simultaneously
# - Measure: memory usage, CPU usage, heartbeat processing latency

# 10 simultaneous job submissions
# - Each triggers full pipeline (detect → analyze → catalog → split → dispatch)
# - Measure: end-to-end pipeline latency
# - Target: < 30 seconds for catalog hits

# Scheduler throughput
# - Queue 100 chunks simultaneously
# - 50 available nodes
# - Measure: time to dispatch all 100 chunks
# - Target: < 5 seconds total

# WebSocket broadcast
# - 20 customers monitoring jobs simultaneously
# - 50 nodes sending heartbeats
# - Measure: message delivery latency
# - Target: < 100ms from event to customer UI update
```

---

## Documentation

### 9. Doc Deliverables

**`docs/architecture.md`:**
- System architecture diagram (Mermaid)
- Component descriptions
- Data flow diagrams
- Network model explanation

**`docs/api.md`:**
- Auto-generated from FastAPI OpenAPI spec
- All endpoints with request/response examples
- WebSocket message schemas
- Authentication guide

**`docs/deployment.md`:**
- Docker Compose local dev setup
- GCP deployment guide
- Environment variables reference
- Database migration guide

**`docs/contributing.md`:**
- Dev environment setup
- Code style guide (Ruff config)
- PR workflow
- Testing guide

---

## Error Tracking

### 10. Sentry Integration

```python
# Server (FastAPI):
import sentry_sdk
sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

# Web app (Next.js):
# @sentry/nextjs — auto-captures client + server errors

# Tauri app:
# sentry-tauri crate — captures Rust panics + JS errors
```

**Sentry project structure:**
- `campugrid-server` — API errors, pipeline failures, scheduler issues
- `campugrid-web` — Frontend JS errors, API call failures
- `campugrid-client` — Daemon crashes, Docker errors, GPU issues

---

## SEO & Meta Tags

### 11. SEO Setup

```typescript
// web/app/(marketing)/layout.tsx
export const metadata: Metadata = {
    title: "CampuGrid — Distributed GPU Computing for Students",
    description: "Turn idle campus GPUs into a supercomputer. ML training, 3D rendering, and data processing at 50-70% less than cloud. Zero config required.",
    keywords: "GPU computing, distributed computing, ML training, 3D rendering, campus compute",
    openGraph: {
        title: "CampuGrid",
        description: "Idle GPUs → Campus Supercomputer",
        url: "https://campugrid.com",
        type: "website",
        images: ["/og-image.png"],  // Generated with generate_image tool
    },
    twitter: {
        card: "summary_large_image",
        title: "CampuGrid",
        description: "50-70% cheaper than cloud GPU compute",
    },
};
```

---

## Phase 7 Completion Test

1. **Marketing site:** All pages render correctly, animations work, responsive on mobile
2. **Navigation:** Marketing ↔ App navigation works, auth redirects correct
3. **E2E:** All 5 test scenarios pass
4. **Performance:** All benchmarks meet targets
5. **Docs:** All 4 documents written and accurate
6. **Sentry:** Test error appears in Sentry dashboard
7. **SEO:** Lighthouse score > 90 for marketing pages
