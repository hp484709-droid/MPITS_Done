import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mpits_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const api = {
  // Auth
  login: async (username, password) => {
    const response = await client.post('/api/login', { username, password });
    if (response.data && response.data.access_token) {
      localStorage.setItem('mpits_token', response.data.access_token);
      localStorage.setItem('mpits_role', username === 'admin' ? 'admin' : 'operator');
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('mpits_token');
    localStorage.removeItem('mpits_role');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('mpits_token');
  },
  
  getUserRole: () => {
    return localStorage.getItem('mpits_role') || 'operator';
  },

  // Missing Person Database (MDB)
  enrollPerson: async (formData) => {
    // Requires multipart/form-data for image upload
    const response = await client.post('/api/mdb', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  listMissingPersons: async () => {
    const response = await client.get('/api/mdb');
    return response.data;
  },
  
  deleteMissingPerson: async (id) => {
    const response = await client.delete(`/api/mdb/${id}`);
    return response.data;
  },
  
  updatePersonStatus: async (id, status) => {
    const response = await client.post(`/api/mdb/${id}/status`, { status });
    return response.data;
  },

  // Detection and Live Feeds
  detectFrame: async (cameraId, frameBase64) => {
    const response = await client.post('/api/detect', {
      camera_id: cameraId,
      frame: frameBase64,
    });
    return response.data;
  },
  
  getMatches: async (status = 'pending') => {
    const response = await client.get(`/api/matches?status=${status}`);
    return response.data;
  },
  
  reviewMatch: async (id, decision) => {
    const response = await client.post(`/api/matches/${id}/review`, { decision });
    return response.data;
  },

  // Trajectory
  getTrajectory: async (personId) => {
    const response = await client.get(`/api/trajectory/${personId}`);
    return response.data;
  },

  // Family Notifications
  getFamilyShortlist: async (token) => {
    const response = await client.get(`/api/family/shortlist/${token}`);
    return response.data;
  },
  
  selectFamilyCandidate: async (token, selectedMatchId) => {
    const response = await client.post(`/api/family/shortlist/${token}/select`, {
      selected_match_id: selectedMatchId,
    });
    return response.data;
  },
  
  getFamilyLocation: async (personId) => {
    const response = await client.get(`/api/family/location/${personId}`);
    return response.data;
  },
  
  reportSighting: async (formData) => {
    const response = await client.post('/api/sighting', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Helper to construct full URLs for static files (e.g. mdb_images, matched_frames)
  getFileUrl: (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  }
};
