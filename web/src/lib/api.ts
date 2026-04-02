export class CampuGridAPI {
  private baseUrl: string;
  private token: string;

  constructor(token: string) {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
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

  async getJobs(page = 1, limit = 20) {
    return this.fetch(`/jobs?page=${page}&limit=${limit}`);
  }

  async getJob(jobId: string) {
    return this.fetch(`/jobs/${jobId}`);
  }

  async submitJob(files: File[], mlSyncMode?: string) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    // Must omit Content-Type header so fetch can set the multipart boundary automatically
    const options: RequestInit = {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };

    let url = "/jobs/";
    if (mlSyncMode) {
      url += `?ml_sync_mode=${mlSyncMode}`;
    }

    const res = await fetch(`${this.baseUrl}${url}`, options);
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
}
