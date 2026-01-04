const API_BASE_URL = 'http://localhost:3000/api';

export const apiCall = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const jsonData = await response.json();

    if (!response.ok) {
      throw new Error(jsonData.message || 'An error occurred');
    }

    return jsonData;
  } catch (error) {
    throw new Error(error.message || 'Network error');
  }
};

// FormData API call for file uploads
export const apiCallFormData = async (method, endpoint, formData) => {
  try {
    const config = {
      method,
    };

    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        Authorization: `Bearer ${token}`,
      };
    }

    if (formData) {
      config.body = formData;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const jsonData = await response.json();

    if (!response.ok) {
      throw new Error(jsonData.message || 'An error occurred');
    }

    return jsonData;
  } catch (error) {
    throw new Error(error.message || 'Network error');
  }
};

// Auth API calls
export const authAPI = {
  // Admin Auth
  adminRegister: (data) => apiCall('POST', '/admin/register', data),
  adminLogin: (data) => apiCall('POST', '/admin/login', data),
  adminGetProfile: () => apiCall('GET', '/admin/profile'),
  adminUpdateProfile: (data) => apiCall('PUT', '/admin/profile', data),
  adminDeleteProfile: () => apiCall('DELETE', '/admin/profile'),

  // Super Admin Auth
  superAdminRegister: (data) => apiCall('POST', '/superadmin/register', data),
  superAdminLogin: (data) => apiCall('POST', '/superadmin/login', data),
  superAdminGetProfile: () => apiCall('GET', '/superadmin/profile'),
  superAdminUpdateProfile: (data) => apiCall('PUT', '/superadmin/profile', data),
  superAdminDeleteProfile: () => apiCall('DELETE', '/superadmin/profile'),
};

// Bus API calls
export const busAPI = {
  getAllBuses: () => apiCall('GET', '/buses'),
  getBusById: (id) => apiCall('GET', `/buses/${id}`),
  createBus: (data) => apiCall('POST', '/buses', data),
  createBusWithImage: (formData) => apiCallFormData('POST', '/buses', formData),
  updateBus: (id, data) => apiCall('PUT', `/buses/${id}`, data),
  deleteBus: (id) => apiCall('DELETE', `/buses/${id}`),
};

// Prediction API calls
export const predictionAPI = {
  getPrediction: (data) => apiCall('POST', '/predict', data),
  getPredictionHistory: () => apiCall('GET', '/predictive-time-buses'),
};
