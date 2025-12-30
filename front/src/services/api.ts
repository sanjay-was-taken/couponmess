const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://couponmess.onrender.com';

// Helper to handle headers and errors
const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token'); 
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}), // Auto-attach token
    ...options.headers,
  } as HeadersInit; // <--- Type assertion fixes TS error

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Request Failed');
  }

  return data;
};

// ==========================================
// 2. AUTH API
// ==========================================
export const authApi = {
  login: (credentials: { username: string; password?: string }) => 
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  googleLogin: (token: string) => 
    request('/auth/google', { method: 'POST', body: JSON.stringify({ token }) }),

  // Add this new method
  volunteerLogin: (credentials: { username: string; password: string }) => 
    request('/auth/volunteer-login', { method: 'POST', body: JSON.stringify(credentials) }),
};


// ==========================================
// 3. EVENTS API (Admin & Shared)
// ==========================================
export const eventsApi = {
  getAll: () => 
    request('/events'),

  create: (eventData: any) => 
    request('/events', { method: 'POST', body: JSON.stringify(eventData) }),

  update: (id: number, eventData: any) => 
    request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(eventData) }),

  delete: (id: number) => 
    request(`/events/${id}`, { method: 'DELETE' }),

  createSlots: (eventId: number, slotData: any) => 
    request(`/events/${eventId}/slots`, { method: 'POST', body: JSON.stringify(slotData) }),

  getScanHistory: (eventId: number) => 
    request(`/events/${eventId}/scan-history`),

  // Stats
  getStats: (eventId: number) => 
    request(`/events/${eventId}/stats`),
    
  getVolunteerStats: (eventId: number, volunteerId: number) => 
    request(`/events/${eventId}/stats/volunteer/${volunteerId}`),

  // ⚠️ UPDATED: This now fetches ALL events (Past + Active)
  // The DashboardPage will filter them based on date/time.
  getActiveForStudent: (studentId: number) => 
    request(`/events/student/${studentId}/all`),

  getVolunteers: (eventId: number) => 
    request(`/events/${eventId}/volunteers`),

  getAllForStudent: (studentId: number) => 
    request(`/events/all-for-student?student_id=${studentId}`),

  addVolunteer: (eventId: number, data: any) => 
    request(`/events/${eventId}/volunteers`, { method: 'POST', body: JSON.stringify(data) }),

  deleteVolunteer: (volunteerId: number) => 
  request(`/events/volunteers/${volunteerId}`, { method: 'DELETE' }),

getEventSlots: (eventId: number) => 
    request(`/events/${eventId}/slots`),

  updateVolunteerAssignment: (volunteerId: number, assignment: { floor: string; counter: string }) => 
    request(`/events/volunteers/${volunteerId}/assignment`, { 
      method: 'PATCH', 
      body: JSON.stringify(assignment) 
    }),
  
};

// ==========================================
// 4. REGISTRATION / SCANNER API
// ==========================================
export const registrationApi = {
  scan: (qrToken: string, volunteerId: number) => 
    request('/registrations/scan', { 
      method: 'POST', 
      body: JSON.stringify({ qr_token: qrToken, volunteer_id: volunteerId }) 
    }),

  register: (studentId: number, eventId: number) => 
    request('/registrations', { 
        method: 'POST', 
        body: JSON.stringify({ student_id: studentId, event_id: eventId }) 
    }),
};
