/**
 * ProofBox - API Client Module
 * Communicates with the Node.js Express REST Backend
 */

const API_BASE = `${window.location.origin}/api`;

class ProofBoxAPI {
  constructor() {
    this.token = localStorage.getItem('proofbox_token_v1') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('proofbox_token_v1', token);
    } else {
      localStorage.removeItem('proofbox_token_v1');
    }
  }

  getHeaders(isMultipart = false) {
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async request(method, path, body = null, isMultipart = false) {
    const opts = {
      method,
      headers: this.getHeaders(isMultipart)
    };

    if (body) {
      opts.body = isMultipart ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      // Re-throw with descriptive error
      throw err;
    }
  }

  // Auth operations
  async register(name, email, password) {
    return this.request('POST', '/auth/register', { name, email, password });
  }

  async login(email, password) {
    return this.request('POST', '/auth/login', { email, password });
  }

  async getMe() {
    return this.request('GET', '/auth/me');
  }

  // Case operations
  async getCases() {
    return this.request('GET', '/cases');
  }

  async createCase(data) {
    return this.request('POST', '/cases', data);
  }

  async getCase(id) {
    return this.request('GET', `/cases/${id}`);
  }

  async updateCase(id, data) {
    return this.request('PUT', `/cases/${id}`, data);
  }

  async deleteCase(id) {
    return this.request('DELETE', `/cases/${id}`);
  }

  async seedDemoCase() {
    return this.request('POST', '/cases/seed-demo');
  }

  // Exhibit operations
  async getExhibits(caseId) {
    return this.request('GET', `/cases/${caseId}/exhibits`);
  }

  async createExhibit(caseId, formData) {
    return this.request('POST', `/cases/${caseId}/exhibits`, formData, true);
  }

  async createExhibitJSON(caseId, data) {
    return this.request('POST', `/cases/${caseId}/exhibits`, data);
  }

  async batchCreateExhibits(caseId, exhibits) {
    return this.request('POST', `/cases/${caseId}/exhibits/batch`, { exhibits });
  }

  async updateExhibit(caseId, id, data) {
    return this.request('PUT', `/cases/${caseId}/exhibits/${id}`, data);
  }

  async deleteExhibit(caseId, id) {
    return this.request('DELETE', `/cases/${caseId}/exhibits/${id}`);
  }

  fileUrl(exhibitId) {
    return `${API_BASE}/exhibits/${exhibitId}/file?token=${encodeURIComponent(this.token || '')}`;
  }

  // Claims operations
  async getClaims(caseId) {
    return this.request('GET', `/cases/${caseId}/claims`);
  }

  async createClaim(caseId, data) {
    return this.request('POST', `/cases/${caseId}/claims`, data);
  }

  async updateClaim(caseId, id, data) {
    return this.request('PUT', `/cases/${caseId}/claims/${id}`, data);
  }

  async deleteClaim(caseId, id) {
    return this.request('DELETE', `/cases/${caseId}/claims/${id}`);
  }

  // Export URLs
  exportJsonUrl(caseId) {
    return `${API_BASE}/cases/${caseId}/export/json?token=${encodeURIComponent(this.token || '')}`;
  }

  exportZipUrl(caseId) {
    return `${API_BASE}/cases/${caseId}/export/zip?token=${encodeURIComponent(this.token || '')}`;
  }
}

window.proofboxAPI = new ProofBoxAPI();
