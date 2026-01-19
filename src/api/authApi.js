import { getAxiosInstance } from "./axiosConfig";
import { getAPIBaseURL } from "../utils/apiConfig";
import logger from "../utils/logger";

/**
 * Authentication API service
 * Handles user registration, login, and token management
 */

const AUTH_TOKEN_KEY = "halal_kitchen_token";
const USER_DATA_KEY = "halal_kitchen_user";

/**
 * Save authentication token and user data to localStorage
 */
export function saveAuth(token, user) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  } catch (error) {
    logger.error("Error saving auth:", error);
  }
}

/**
 * Get authentication token from localStorage
 */
export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    logger.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Get user data from localStorage
 */
export function getUserData() {
  try {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    logger.error("Error getting user data:", error);
    return null;
  }
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuth() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  } catch (error) {
    logger.error("Error clearing auth:", error);
  }
}

/**
 * Register a new user
 */
export async function register(email, password, displayName) {
  try {
    const axios = await getAxiosInstance();
    const response = await axios.post("/api/auth/register", {
      email,
      password,
      displayName,
    });

    if (response.data.token && response.data.user) {
      saveAuth(response.data.token, response.data.user);
    }

    return response.data;
  } catch (error) {
    logger.error("Registration error:", error);
    
    // Handle HTML error responses (e.g., 404 from Express)
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE')) {
      const baseURL = await getAPIBaseURL();
      throw { 
        error: `Backend server not responding correctly. Please ensure the backend is running at ${baseURL}. If you're in production, check that the backend is deployed.` 
      };
    }
    
    // Handle JSON error responses
    if (error.response?.data?.error) {
      throw { error: error.response.data.error };
    }
    
    // Handle network errors
    if (error.code === "ECONNREFUSED" || error.message?.includes("Network Error")) {
      throw { error: "Unable to connect to server. Please check your internet connection and ensure the backend is running." };
    }
    
    // Handle HTTP status errors
    if (error.response?.status === 400) {
      throw { error: error.response.data?.error || "Invalid request. Please check your input." };
    }
    
    if (error.response?.status === 409) {
      throw { error: "An account with this email already exists." };
    }
    
    // Generic fallback
    throw { error: error.message || "Registration failed. Please try again." };
  }
}

/**
 * Login user
 */
export async function login(email, password) {
  try {
    const axios = await getAxiosInstance();
    const response = await axios.post("/api/auth/login", {
      email,
      password,
    });

    if (response.data.token && response.data.user) {
      saveAuth(response.data.token, response.data.user);
    }

    return response.data;
  } catch (error) {
    logger.error("Login error:", error);
    throw error.response?.data || { error: "Login failed" };
  }
}

/**
 * Get current user from API
 */
export async function getCurrentUser() {
  try {
    const token = getAuthToken();
    if (!token) {
      return null;
    }

    const axios = await getAxiosInstance();
    const response = await axios.get("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.user) {
      saveAuth(token, response.data.user); // Update local storage
      return response.data.user;
    }

    return null;
  } catch (error) {
    logger.error("Get current user error:", error);
    // Token might be invalid, clear it
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAuth();
    }
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken();
}
