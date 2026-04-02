# CampuGrid Architecture

This document outlines the distributed architecture of the CampuGrid platform, highlighting the interactions between the Next.js Consumer Web App, the FastAPI/Celery Orchestration Layer, and the Tauri Contributor Nodes.

## System Topology 

```mermaid
graph TD
    subgraph "Consumer Edge (Next.js)"
        CA[Web Client App]
        CA -- "HTTP/JSON Job Submission" --> OG[FastAPI Gateway]
        CA -- "WebSockets: Live Monitoring" --> OG
    end

    subgraph "Control Plane (Python/Redis/Postgres)"
        OG[FastAPI Gateway] -- "Inserts" --> DB[(PostgreSQL Models)]
        OG -- "Enqueues AI Pipeline tasks" --> RQ[(Redis Queue)]
        
        RQ --> CW1[Celery Worker: Pipeline Analyzer]
        RQ --> CW2[Celery Worker: Chunk Splitter]
        RQ --> CW3[Celery Worker: Matcher & Dispatcher]
        
        CW1 -- "Calls out for dynamic inference" --> GEMINI[Google Gemini API]
        CW3 -- "Queries online nodes" --> DB
    end

    subgraph "Campus Infrastructure (Node Network)"
        OG -. "Persistent WS heartbeat" .- TA1[Tauri App Node A]
        OG -. "Persistent WS heartbeat" .- TA2[Tauri App Node B]
        
        CW3 -- "Publishes Job Specs via WS" --> TA1
        CW3 -- "Publishes Job Specs via WS" --> TA2
        
        TA1 -- "Executes container" --> DK1[Local Docker Daemon]
        TA2 -- "Executes container" --> DK2[Local Docker Daemon]
        
        DK1 -- "Local SGD / MPI (Overlay)" <--> DK2
    end
```

## Deep Dive: The AI Pipeline

The AI pipeline entirely bypasses manual configuration by the user.

```mermaid
sequenceDiagram
    participant User
    participant Web
    participant Server API
    participant AI Pipeline
    participant Gemini API
    
    User->>Web: Drops `blender_render.blend` (Drag & Drop)
    Web->>Server API: POST /jobs/ (Multipart Form)
    Server API->>AI Pipeline: Push Task `analyze_job`
    AI Pipeline->>AI Pipeline: AST / Binary Heuristics
    AI Pipeline-->>Gemini API: Prompt: "What does this script need?"
    Gemini API-->>AI Pipeline: JSON: { "type": "render", "framework": "blender" }
    AI Pipeline->>Server API: Pipeline Complete (WS Emit)
    Server API-->>Web: Present Job Profile to User
```

## Fault Tolerance: The Watchdog

Because CampuGrid runs on untrusted, consumer hardware on university Wi-Fi, it relies on a Watchdog process to ensure tasks complete.

```mermaid
stateDiagram-v2
    [*] --> Queued
    Queued --> Running: Dispatcher assigns to Node A
    
    state Running {
        NodeA_Heartbeat_OK
    }
    
    Running --> Watchdog_Intervention: Node A disconnects (Heartbeat timeout)
    Running --> Completed: Chunk successful
    Running --> Failed: Runtime Error
    
    Watchdog_Intervention --> Penalize_Node: Decrease Reliability Score
    Watchdog_Intervention --> Queued: Return Chunk to unassigned pool
    
    Completed --> Assembler: Merge Result (e.g. Weights, Video)
    Assembler --> [*]
```
