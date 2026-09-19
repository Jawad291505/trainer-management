import { api } from './api'

// The current client's follow-ups with their trainer. The API scopes the list
// to the signed-in client and never includes the trainer's private notes.
// Each item carries a derived `bucket`: today / upcoming / overdue / completed / missed.
export const listFollowUps = () => api.get('/followups').then((res) => res.items || [])
