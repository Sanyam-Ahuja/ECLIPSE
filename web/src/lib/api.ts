export class CampuGridAPI {
  private baseUrl: string;
  private token: string;

  constructor(token: string) {
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    
    // Automatically upgrade to HTTPS if we're hitting the production sslip.io or GCP IP
    if (baseUrl.includes("sslip.io") || baseUrl.includes("34.100.183.146")) {
      baseUrl = baseUrl.replace("http://", "https://");
    }
    
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`);
    }

    return res.json();
  }

  // ── Jobs (Customer) ──────────────────────────────────────
  async getJobs(page = 1, limit = 20) {
    return this.fetch(`/jobs?page=${page}&limit=${limit}`);
  }

  async getJob(jobId: string) {
    return this.fetch(`/jobs/${jobId}`);
  }

  async submitJob(files: File[], mlSyncMode?: string, requiresPublicNetwork = false) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const options: RequestInit = {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };

    let url = "/jobs/";
    const params = new URLSearchParams();
    if (mlSyncMode) params.append("ml_sync_mode", mlSyncMode);
    if (requiresPublicNetwork) params.append("requires_public_network", "true");
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(`${this.baseUrl}${url}`, options);
    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`);
    }
    return res.json();
  }

  async resolveDockerfile(jobId: string, options: { dockerfile?: File; useAi?: boolean }) {
    const formData = new FormData();
    if (options.dockerfile) {
      formData.append("dockerfile", options.dockerfile);
    }
    
    let url = `/jobs/${jobId}/resolve_dockerfile`;
    if (options.useAi) {
      url += "?use_ai=true";
    }

    const fetchOptions: RequestInit = {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };

    const res = await fetch(`${this.baseUrl}${url}`, fetchOptions);
    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`);
    }
    return res.json();
  }

  async getEstimate(gpuTier: string, hours: number, syncMode = "local_sgd") {
    return this.fetch(`/jobs/estimate/price?gpu_tier=${encodeURIComponent(gpuTier)}&estimated_hours=${hours}&sync_mode=${syncMode}`);
  }

  async cancelJob(jobId: string) {
    return this.fetch(`/jobs/${jobId}/cancel`, { method: "POST" });
  }

  // ── Nodes (Contributor) ──────────────────────────────────
  async getMyNodes() {
    return this.fetch("/nodes/me");
  }

  async registerNode(data: {
    hostname: string;
    cpu_cores: number;
    ram_gb: number;
    gpu_model: string;
    gpu_vram_gb: number;
    cuda_version?: string;
    os: string;
    bandwidth_mbps?: number;
    ip_address?: string;
  }) {
    return this.fetch("/nodes/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async regenerateNodeToken(nodeId: string) {
    return this.fetch(`/nodes/me/${nodeId}/token`, { method: "POST" });
  }

  async getNodeHistory(nodeId: string, page = 1, limit = 15) {
    return this.fetch(`/nodes/me/${nodeId}/history?page=${page}&limit=${limit}`);
  }

  async getClusterStats() {
    return this.fetch("/nodes/stats");
  }

  async getLeaderboard(period = "month", limit = 20) {
    return this.fetch(`/nodes/leaderboard?period=${period}&limit=${limit}`);
  }

  // ── Billing ──────────────────────────────────────────────
  async getEarnings() {
    return this.fetch("/billing/earnings");
  }

  async getBillingHistory(page = 1, limit = 20) {
    return this.fetch(`/billing/history?page=${page}&limit=${limit}`);
  }

  // ── Admin ───────────────────────────────────────────────
  async getAdminOverview() {
    return this.fetch("/admin/overview");
  }

  async getAdminUsers(page = 1, limit = 20) {
    return this.fetch(`/admin/users?page=${page}&limit=${limit}`);
  }

  async updateUserRole(userId: string, role: string) {
    return this.fetch(`/admin/users/${userId}/role?role=${role}`, { method: "PATCH" });
  }

  async getAdminNodes(page = 1, limit = 50) {
    return this.fetch(`/admin/nodes?page=${page}&limit=${limit}`);
  }

  async getAdminJobs(page = 1, limit = 20, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    return this.fetch(`/admin/jobs?${params}`);
  }
}
