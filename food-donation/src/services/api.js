import axios from 'axios';
import DonationHistory from '../pages/DonationHistory';

const api = axios.create({
  baseURL: '',
  timeout: 15000,
});

// simple UUID for headers
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Request interceptors: JWT + idempotency + correlation
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth:user');
  const auth = raw ? JSON.parse(raw) : null;
  if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;

  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    config.headers['Idempotency-Key'] = uuid();
  }
  config.headers['X-Correlation-Id'] = uuid();
  return config;
});

// Endpoints
export const AuthAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (payload) => api.post('/auth/register', payload),
};

export const DonationAPI = {
  createDonation: (payload) => api.post('/donation', payload),
  listRecent: ({ limit = 10 } = {}) => api.get('/donation', { params: { limit } }),
  DonationHistory: (userId) => api.get(`/donation/history/${userId}`),
};


export const InventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  getNearingExpiry: () => api.get('/inventory/nearing-expiry'),
  updateFood: (itemId, body) => api.patch(`/admin/food/${itemId}`, body),
};
export const AdminAPI = {
  list: () => api.get('/admin'),
  blist: () => api.get("/admin/bookings"), 
  categorieslist: () => api.get('/admin/categories'),
  adminList: (params) => api.get('/bookings/admin', { params }), 
  updateStatus: (bookingId, { status }) => api.patch(`/admin/bookings/${bookingId}/status`, { status }),
}

export const BookingAPI = {
  list: () => api.get("/admin/bookings"),
  create: (payload) => api.post('/bookings', payload),
  myBookings: () => api.get('/bookings/me'),
  availability: (locationId) => api.get('/bookings/availability', { params: { locationId } }),
  adminList: (params) => api.get('/bookings/admin', { params }),
  updateStatus: (bookingId, { status }) => api.patch(`/admin/bookings/${bookingId}/status`, { status }),
};

export const LocationsAPI = {
  list: () => api.get('/locations'),
  updateItem: (itemId, payload) => api.patch(`/items/${itemId}`, payload), // {name?, category?}
  updateLot: (lotId, payload) => api.patch(`/inventory/lots/${lotId}`, payload), // {location_id?, qty?, expiry_date?}
};


export const CategoriesAPI = {
  list: () => api.get('/categories'),          
};

export const DietaryAPI = {
  list: () => api.get('/dietary-restrictions'),
};
export const IncomeGroupAPI = {
  list: () => api.get('/income-groups'),
};

export const UnitsAPI = {
  list: () => api.get('/units'),  // expects [{ id, name }]
};

export default api;
