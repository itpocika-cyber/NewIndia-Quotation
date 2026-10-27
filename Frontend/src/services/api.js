const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname.includes('gitlab.io') ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app'))
    ? 'https://pocika-quotation.onrender.com/api/v1'
    : '/api/v1');

/**
 * Universal authenticated fetch wrapper for Pocika backend API
 */
// Helper delay
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keep track of consecutive network failures globally
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 8;

/**
 * Universal authenticated fetch wrapper for Pocika backend API with Smart Retry & Fallback
 */
async function request(endpoint, options = {}, retries = 3) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('pocika_auth_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  // If consecutive network failures reached the limit, advise cooling down
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    const cooldownErr = new Error(
      'Server unreachable. Please check your connection and try again in a few moments.'
    );
    cooldownErr.status = 503;
    cooldownErr.isCooldown = true;
    setTimeout(() => { consecutiveFailures = 0; }, 30000);
    throw cooldownErr;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set 25-second controller timeout to avoid hanging requests indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const reqConfig = { ...config, signal: controller.signal };

      const res = await fetch(url, reqConfig);
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // If 500, 502, 503, 504 server error, retry
        if ([500, 502, 503, 504].includes(res.status) && attempt < retries) {
          consecutiveFailures++;
          await wait(1000 * (attempt + 1));
          continue;
        }

        consecutiveFailures = 0; // Reset on clear client response
        const errorMsg = data?.error || data?.message || `Request failed (${res.status})`;
        const err = new Error(errorMsg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      // Success: reset failure counter
      consecutiveFailures = 0;
      return data;
    } catch (err) {
      const isNetworkError =
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('Network request failed');

      if (isNetworkError) {
        consecutiveFailures++;
        if (attempt < retries) {
          // Retry automatically after backoff
          await wait(1200 * (attempt + 1));
          continue;
        }

        // Exhausted retries for this call
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          const friendlyErr = new Error(
            'Connection lost. Please check your network and retry shortly.'
          );
          friendlyErr.status = 0;
          throw friendlyErr;
        }

        const friendlyErr = new Error(
          'Network error. Please check your connection and retry.'
        );
        friendlyErr.status = 0;
        throw friendlyErr;
      }

      // Re-throw handled API errors
      throw err;
    }
  }
}

/**
 * Core API Service Abstraction
 * Preserves exact method names and signatures while communicating with Express + MongoDB backend.
 */
export const api = {
  // === AUTHENTICATION ===
  auth: {
    async wakeUp() {
      // Dummy fetch to wake up Render instance from sleep
      try {
        fetch(`${API_BASE_URL.replace('/v1', '')}/health`);
      } catch (e) { }
    },
    async login(credentials) {
      return await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    },
    async logout() {
      return await request('/auth/logout', {
        method: 'POST'
      });
    },
    async getMe() {
      return await request('/auth/me');
    },
    async changePassword(passwords) {
      return await request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwords)
      });
    }
  },

  // === MASTERS (Company, Settings, Customers, Products, Auxiliary) ===
  masters: {
    // Customers
    async getCustomers() {
      const res = await request('/customers');
      return res.data || [];
    },
    async createCustomer(data) {
      const res = await request('/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async updateCustomer(id, data) {
      const res = await request(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async deleteCustomer(id) {
      return await request(`/customers/${id}`, {
        method: 'DELETE'
      });
    },

    // Products
    async getProducts() {
      const res = await request('/products');
      return res.data || [];
    },
    async createProduct(data) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const res = await request('/products', {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      });
      return res.data;
    },
    async updateProduct(id, data) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const res = await request(`/products/${id}`, {
        method: 'PUT',
        body: isFormData ? data : JSON.stringify(data)
      });
      return res.data;
    },
    async deleteProduct(id) {
      return await request(`/products/${id}`, {
        method: 'DELETE'
      });
    },

    // Settings & Company
    async getSettings() {
      const res = await request('/masters/settings');
      return res.data;
    },
    async updateSettings(data) {
      const res = await request('/masters/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async getCompany() {
      const res = await request('/masters/company');
      return res.data;
    },
    async updateCompany(data) {
      const res = await request('/masters/company', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },

    // Consolidated Initial Load (fetches all masters, quotations, and activity at once)
    async getAll() {
      const res = await request('/masters/all');
      return res.data;
    },

    // Auxiliary Masters: Categories
    async getCategories() {
      const res = await request('/masters/categories');
      return res.data || [];
    },
    async addCategory(data) {
      const res = await request('/masters/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async updateCategory(id, data) {
      const res = await request(`/masters/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async deleteCategory(id) {
      return await request(`/masters/categories/${id}`, {
        method: 'DELETE'
      });
    },

    // Auxiliary Masters: Units
    async getUnits() {
      const res = await request('/masters/units');
      return res.data || [];
    },
    async addUnit(data) {
      const res = await request('/masters/units', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async updateUnit(id, data) {
      const res = await request(`/masters/units/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async deleteUnit(id) {
      return await request(`/masters/units/${id}`, {
        method: 'DELETE'
      });
    },

    // Auxiliary Masters: Taxes
    async getTaxes() {
      const res = await request('/masters/taxes');
      return res.data || [];
    },
    async addTax(data) {
      const res = await request('/masters/taxes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async updateTax(id, data) {
      const res = await request(`/masters/taxes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async deleteTax(id) {
      return await request(`/masters/taxes/${id}`, {
        method: 'DELETE'
      });
    },

    // Auxiliary Masters: Payment Terms
    async getPaymentTerms() {
      const res = await request('/masters/payment-terms');
      return res.data || [];
    },
    async addPaymentTerm(data) {
      const res = await request('/masters/payment-terms', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async updatePaymentTerm(id, data) {
      const res = await request(`/masters/payment-terms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async deletePaymentTerm(id) {
      return await request(`/masters/payment-terms/${id}`, {
        method: 'DELETE'
      });
    },

    // Auxiliary Masters: Terms & Conditions
    async getTermsConditions() {
      const res = await request('/masters/terms-conditions');
      return res.data || [];
    },
    async addTermCondition(data) {
      const res = await request('/masters/terms-conditions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async updateTermCondition(id, data) {
      const res = await request(`/masters/terms-conditions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.data;
    },
    async deleteTermCondition(id) {
      return await request(`/masters/terms-conditions/${id}`, {
        method: 'DELETE'
      });
    },

    // Full backup import & database reset
    async importBackup(backupData) {
      return await request('/masters/backup/import', {
        method: 'POST',
        body: JSON.stringify(backupData)
      });
    },
    async resetAll() {
      return await request('/masters/reset', {
        method: 'POST'
      });
    }
  },

  // === QUOTATIONS ===
  quotations: {
    async getAll() {
      const res = await request('/quotations');
      return res.data || [];
    },
    async getById(idOrQuotationNo) {
      const res = await request(`/quotations/${encodeURIComponent(idOrQuotationNo)}`);
      return res.data;
    },
    async getNextNumber(prefix) {
      const p = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
      const res = await request(`/quotations/next-number${p}`);
      return res.data;
    },
    async generateInquiryNumber() {
      const res = await request('/quotations/next-inquiry');
      return res.data;
    },
    async save(quotation) {
      const res = await request('/quotations/save', {
        method: 'POST',
        body: JSON.stringify(quotation)
      });
      return res.data;
    },
    async updateStatus(quotationNo, status) {
      const res = await request(`/quotations/${encodeURIComponent(quotationNo)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      return res.data;
    },
    async delete(quotationNo) {
      return await request(`/quotations/${encodeURIComponent(quotationNo)}`, {
        method: 'DELETE'
      });
    },
    async downloadPdf(idOrQuotationNo, customFilename) {
      const token = localStorage.getItem('pocika_auth_token');
      const url = `${API_BASE_URL}/quotations/${encodeURIComponent(idOrQuotationNo)}/pdf`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to download PDF (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = customFilename || `${idOrQuotationNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      return true;
    },
    async renderPdfFromData(quotationData, customFilename) {
      const token = localStorage.getItem('pocika_auth_token');
      const url = `${API_BASE_URL}/quotations/render-pdf`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(quotationData)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to generate PDF (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = customFilename || `${quotationData.quotationNo || 'Quotation'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      return true;
    },
    getPdfUrl(idOrQuotationNo) {
      const token = localStorage.getItem('pocika_auth_token');
      return `${API_BASE_URL}/quotations/${encodeURIComponent(idOrQuotationNo)}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }
  },

  // === ACTIVITY LOGS ===
  activity: {
    async getLogs(params = {}) {
      const query = new URLSearchParams();
      if (params.user && params.user !== 'ALL') query.set('user', params.user);
      if (params.action && params.action !== 'ALL') query.set('action', params.action);
      if (params.search) query.set('search', params.search);
      if (params.quotationNo) query.set('quotationNo', params.quotationNo);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
      if (params.limit) query.set('limit', params.limit);
      const qs = query.toString() ? `?${query.toString()}` : '';
      const res = await request(`/activity${qs}`);
      return res.data || [];
    },
    async log(data) {
      const res = await request('/activity', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.data;
    }
  },

  // === USER MANAGEMENT (Admin Only) ===
  users: {
    async getAll() {
      const res = await request('/users');
      return res.data || [];
    },
    async getUserWork(id) {
      const res = await request(`/users/${id}/work`);
      return res.data;
    },
    async create(userData) {
      const res = await request('/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      return res.data;
    },
    async update(id, userData) {
      const res = await request(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(userData)
      });
      return res.data;
    },
    async delete(id) {
      return await request(`/users/${id}`, {
        method: 'DELETE'
      });
    }
  }
};

export default api;
