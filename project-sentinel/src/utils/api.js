import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
);

// Helper functions for user roles
export const getUserJobTitle = (role) => {
  const roleTitles = {
    'admin': 'Senior Cyber Crime Officer',
    'analyst': 'Cyber Crime Analyst', 
    'investigator': 'Digital Forensics Investigator',
    'supervisor': 'Cyber Security Supervisor',
    'user': 'Cyber Crime Constable'
  }
  return roleTitles[role] || 'Cyber Crime Officer'
}

export const getUserDepartment = (role) => {
  const roleDepartments = {
    'admin': 'Cyber Crime Headquarters',
    'analyst': 'Intelligence & Analysis Division',
    'investigator': 'Digital Forensics Unit', 
    'supervisor': 'Cyber Security Operations',
    'user': 'Field Operations Unit'
  }
  return roleDepartments[role] || 'Cyber Security Division'
}

export const getUserBio = (role) => {
  const roleBios = {
    'admin': 'Senior officer overseeing cyber crime operations and strategic threat analysis.',
    'analyst': 'Specialist in social media threat detection and misinformation analysis.',
    'investigator': 'Expert in digital forensics and evidence collection for cyber crimes.',
    'supervisor': 'Supervising cyber security operations and coordinating threat response.',
    'user': 'Field officer specializing in cyber crime investigation and prevention.'
  }
  return roleBios[role] || 'Experienced cyber crime officer specializing in digital threat detection.'
}