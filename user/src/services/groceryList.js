import { api } from './api'

// Grocery list for the current client — a rolling 7-day window derived from
// their assigned diet plan + selected meal options (see backend
// groceryList.service.js). Always recomputed live; refresh() just re-anchors
// the 7-day window at "now" and stamps refreshedAt.
export const getGroceryList = (clientId) => api.get(`/clients/${clientId}/grocery-list`)
export const refreshGroceryList = (clientId) => api.post(`/clients/${clientId}/grocery-list/refresh`)
