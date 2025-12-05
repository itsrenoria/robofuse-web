const BASE_URL = '/api';

class RealDebridClient {
  constructor() {
    this.token = localStorage.getItem('rd_token') || null;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('rd_token', token);
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('No API token provided');
    }

    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Token');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async getUserInfo() {
    return this.request('/user');
  }

  async getTorrents(page = 1, limit = 100) {
    return this.request(`/torrents?page=${page}&limit=${limit}`);
  }

  async getDownloads(page = 1, limit = 100) {
    return this.request(`/downloads?page=${page}&limit=${limit}`);
  }

  async addMagnet(magnet) {
    const formData = new FormData();
    formData.append('magnet', magnet);
    return this.request('/torrents/addMagnet', {
      method: 'POST',
      body: formData,
    });
  }

  async addTorrent(file) {
    // 1. Upload file to PUT /torrents/addTorrent
    // But RD API for addTorrent expects the file content in the body
    // Let's use fetch directly for this as we need to send binary data

    const url = `${BASE_URL}/torrents/addTorrent`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        // Content-Type is usually automatically set or not needed for binary PUT
      },
      body: file
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async selectFiles(torrentId, fileIds) {
    const formData = new FormData();
    // If fileIds is 'all', send 'all', otherwise join array
    const filesValue = fileIds === 'all' ? 'all' : fileIds.join(',');
    formData.append('files', filesValue);
    return this.request(`/torrents/selectFiles/${torrentId}`, {
      method: 'POST',
      body: formData,
    });
  }

  async unrestrictLink(link) {
    const formData = new FormData();
    formData.append('link', link);
    return this.request('/unrestrict/link', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteTorrent(torrentId) {
    return this.request(`/torrents/delete/${torrentId}`, {
      method: 'DELETE',
    });
  }

  async deleteDownload(downloadId) {
    return this.request(`/downloads/delete/${downloadId}`, {
      method: 'DELETE',
    });
  }

  async getTorrentInfo(torrentId) {
    return this.request(`/torrents/info/${torrentId}`);
  }
}

export const rdClient = new RealDebridClient();
