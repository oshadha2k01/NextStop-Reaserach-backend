const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
      throw new Error(jsonData.message || jsonData.error || 'An error occurred');
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
      throw new Error(jsonData.message || jsonData.error || 'An error occurred');
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
  adminVerifyOtp: (data) => apiCall('POST', '/admin/verify-otp', data),
  adminResendOtp: (data) => apiCall('POST', '/admin/resend-otp', data),
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
  approveBus: (id) => apiCall('POST', `/buses/${id}/approve`),
  rejectBus: (id, reason) => apiCall('POST', `/buses/${id}/reject`, { reason }),
};

// Driver API calls
export const driverAPI = {
  getAll: () => apiCall('GET', '/drivers'),
  getById: (id) => apiCall('GET', `/drivers/${id}`),
  create: (data) => apiCall('POST', '/drivers', data),
  update: (id, data) => apiCall('PUT', `/drivers/${id}`, data),
  delete: (id) => apiCall('DELETE', `/drivers/${id}`),
  getStats: () => apiCall('GET', '/drivers/stats'),
  getAvailableBuses: () => apiCall('GET', '/drivers/available-buses'),
  login: (data) => apiCall('POST', '/drivers/login', data),
};

// Complaint API calls
export const complaintAPI = {
  getAll: () => apiCall('GET', '/complaints'),
  getById: (id) => apiCall('GET', `/complaints/${id}`),
  create: (data) => apiCall('POST', '/complaints', data),
  update: (id, data) => apiCall('PUT', `/complaints/${id}`, data),
  delete: (id) => apiCall('DELETE', `/complaints/${id}`),
  getStats: () => apiCall('GET', '/complaints/stats'),
};

// Feedback API calls
export const feedbackAPI = {
  getAll: () => apiCall('GET', '/feedback'),
  getById: (id) => apiCall('GET', `/feedback/${id}`),
  create: (data) => apiCall('POST', '/feedback', data),
  update: (id, data) => apiCall('PUT', `/feedback/${id}`, data),
  delete: (id) => apiCall('DELETE', `/feedback/${id}`),
  getStats: () => apiCall('GET', '/feedback/stats'),
  // Alias for backward compatibility
  getAllAlias: () => apiCall('GET', '/feedbacks'),
};

// Bus-Device Registration API calls
export const busDeviceAPI = {
  register: (data) => apiCall('POST', '/bus-device/register', data),
  getAll: () => apiCall('GET', '/bus-device'),
  getByBusId: (busId) => apiCall('GET', `/bus-device/${busId}`),
  update: (busId, data) => apiCall('PUT', `/bus-device/${busId}`, data),
  remove: (busId) => apiCall('DELETE', `/bus-device/${busId}`),
  getStats: () => apiCall('GET', '/bus-device/stats'),
  getUnassignedBuses: () => apiCall('GET', '/bus-device/unassigned-buses'),
};

// IoT API calls
export const iotAPI = {
  getKnownDevices: (limit = 50) => apiCall('GET', `/iot-devices?limit=${limit}`),
};

// Prediction API calls
export const predictionAPI = {
  getPrediction: (data) => apiCall('POST', '/predict', data),
  getPredictionHistory: () => apiCall('GET', '/predictive-time-buses'),
};

// Monitoring/Analytics Helper API
export const monitoringAPI = {
  // Get real-time bus monitoring data (buses with complaint counts and feedback ratings)
  getRealTimeBusMonitoring: async () => {
    try {
      const [buses, complaints, feedbacks] = await Promise.all([
        busAPI.getAllBuses(),
        complaintAPI.getAll(),
        feedbackAPI.getAll(),
      ]);

      // Create maps for quick lookup
      const complaintsByBusId = {};
      const feedbacksByBusId = {};

      // Count complaints per bus
      complaints.forEach((complaint) => {
        if (complaint.busId || complaint.bus_id) {
          const busId = complaint.busId || complaint.bus_id;
          if (!complaintsByBusId[busId]) {
            complaintsByBusId[busId] = {
              total: 0,
              open: 0,
              resolved: 0,
              highPriority: 0,
            };
          }
          complaintsByBusId[busId].total += 1;
          if (complaint.status === 'Open') complaintsByBusId[busId].open += 1;
          if (complaint.status === 'Resolved') complaintsByBusId[busId].resolved += 1;
          if (complaint.priority === 'High') complaintsByBusId[busId].highPriority += 1;
        }
      });

      // Calculate average ratings per bus
      feedbacks.forEach((feedback) => {
        if (feedback.busId || feedback.bus_id) {
          const busId = feedback.busId || feedback.bus_id;
          if (!feedbacksByBusId[busId]) {
            feedbacksByBusId[busId] = {
              ratings: [],
              totalRatings: 0,
              averageRating: 0,
              positiveCount: 0,
              neutralCount: 0,
              negativeCount: 0,
            };
          }
          feedbacksByBusId[busId].ratings.push(feedback.rating || 0);
          feedbacksByBusId[busId].totalRatings += 1;
          
          // Sentiment classification
          const rating = feedback.rating || 0;
          if (rating >= 4) feedbacksByBusId[busId].positiveCount += 1;
          if (rating === 3) feedbacksByBusId[busId].neutralCount += 1;
          if (rating <= 2) feedbacksByBusId[busId].negativeCount += 1;
        }
      });

      // Calculate averages
      Object.keys(feedbacksByBusId).forEach((busId) => {
        const fb = feedbacksByBusId[busId];
        if (fb.ratings.length > 0) {
          fb.averageRating = (
            fb.ratings.reduce((sum, r) => sum + r, 0) / fb.ratings.length
          ).toFixed(1);
        }
      });

      // Combine data with buses
      const enrichedBuses = buses.map((bus) => ({
        ...bus,
        complaints: complaintsByBusId[bus._id] || {
          total: 0,
          open: 0,
          resolved: 0,
          highPriority: 0,
        },
        feedback: feedbacksByBusId[bus._id] || {
          ratings: [],
          totalRatings: 0,
          averageRating: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
        },
        // Determine operational status based on data
        operationalStatus: (() => {
          const fb = feedbacksByBusId[bus._id];
          const comp = complaintsByBusId[bus._id];
          
          if (!fb || fb.averageRating < 2.0) return 'flagged';
          if (comp && comp.highPriority > 0) return 'flagged';
          if (comp && comp.total > 5) return 'maintenance';
          if (fb && fb.averageRating < 3.0) return 'maintenance';
          return 'active';
        })(),
      }));

      return enrichedBuses;
    } catch (error) {
      throw new Error(error.message || 'Failed to get monitoring data');
    }
  },

  // Get complaint trends over time
  getComplaintTrends: async (days = 30) => {
    try {
      const complaints = await complaintAPI.getAll();
      const today = new Date();
      const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

      // Group by date
      const trendsByDate = {};
      complaints.forEach((complaint) => {
        const createdDate = new Date(complaint.createdAt || Date.now());
        if (createdDate >= startDate) {
          const dateStr = createdDate.toISOString().split('T')[0];
          if (!trendsByDate[dateStr]) {
            trendsByDate[dateStr] = 0;
          }
          trendsByDate[dateStr] += 1;
        }
      });

      return Object.entries(trendsByDate).map(([date, count]) => ({
        date,
        complaints: count,
      }));
    } catch (error) {
      throw new Error(error.message || 'Failed to get complaint trends');
    }
  },
};
