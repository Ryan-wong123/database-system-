import axios from 'axios';
import DonationHistory from '../pages/DonationHistory';

const api = axios.create({
  baseURL: 'http://localhost:8000',
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
  createDonation: (payload) => api.post('/donation/create', payload),
  listRecent: ({ limit = 10 } = {}) => api.get('/donation', { params: { limit } }),
  DonationHistory: (userId) => api.get(`/donation/history/${userId}`),
  list:() => api.get('/donation/list'),
  approve: (donationId, approve_status) => api.post(`/donation/approve/${donationId}`, { approve_status }),
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
  approveDonation: (payload) => api.post('/donation/approve', payload), 

}

export const BookingAPI = {
  list: () => api.get("/admin/bookings"),
  create: (payload) => api.post('/bookings', payload),
  myBookings: () => api.get('/bookings/me'),
  availability: (locationId) => api.get('/bookings/availability', { params: { locationId } }),
  adminList: (params) => api.get('/bookings/admin', { params }),
  updateStatus: (bookingId, { status }) => api.patch(`/admin/bookings/${bookingId}/status`, { status }),
};
export const HouseholdAPI = {
  me: () => api.get('/households/me'),
  create: () => api.post('/households'),
  join: (pin) => api.post('/households/join', { pin }),
  leave: () => api.delete('/households/me'),
};

export const LocationsAPI = {
  list: () => api.get('/locations'),
  updateItem: (itemId, payload) => api.patch(`/items/${itemId}`, payload), // {name?, category?}
  updateLot: (lotId, payload) => api.patch(`/inventory/lots/${lotId}`, payload), // {location_id?, qty?, expiry_date?}
};


export const CategoriesAPI = {
  list:() => api.get('/api/foodcategory/list'),
  searchByName:(name) => api.get(`/api/foodcategory/list/${encodeURIComponent(name)}`),
  create:(payload) => api.post('/api/foodcategory/create', payload), // { name }
  update: (id, payload) => api.put(`/api/foodcategory/update/${id}`, payload), // { name }    
};

export const DietAPI = {
  list: () => api.get('/api/diet/list'),
  searchByFlags:(flags) => api.get(`/api/diet/list/${encodeURIComponent(flags)}`),
  create:(payload) => api.post('/api/diet/create', payload),          // { diet_flags }
  update:(id, payload) => api.put(`/api/diet/update/${id}`, payload), // { diet_flags }

};

export const IncomeGroupAPI = {
  list: () => api.get('/income-groups'),
};

export const UnitsAPI = {
  list: () => api.get('/unit/list'),  // expects [{ id, name }]
};

export const DoneeAPI = {
  createHousehold: (data) => api.post('/households', data),
  joinHousehold: (data) => api.post('/households/join', data),
  getHousehold: () => api.get('/households/me'),
  leaveHousehold: () => api.delete('/households/me'),
};

export default api;
