import axios from 'axios'

// Use Next.js public env variable with a sane default
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

export default apiClient
