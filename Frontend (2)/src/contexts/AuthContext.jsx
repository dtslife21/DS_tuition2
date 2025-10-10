import { createContext, useContext, useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage('user', null);
  const [token, setToken] = useLocalStorage('token', null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Create axios instance with base URL
  const api = axios.create({
    baseURL: 'http://localhost:50447/api',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // useEffect(() => {
  //   const authStatus = !!(user && token);
  //   if (isAuthenticated !== authStatus) {
  //     setIsAuthenticated(authStatus);
  //   }
  // }, [user, token, isAuthenticated]);


  const login = async (username, password) => {
  try {
    const response = await api.post('/Users/Login', {
      Username: username,
      Password: password
    });
    
    if (response.status === 200 && response.data) {
      const userData = response.data;
      
       
      const userTypes = {
        1: 'admin',
        2: 'teacher',
        3: 'student'
      };
      
      
      userData.userType = userTypes[userData.userTypeID] || ' `admin';
      
      const userToken = `session_${userData.userID}_${Date.now()}`;
      
      setUser(userData);
      setToken(userToken);
      setIsAuthenticated(true);
      
      return { 
        success: true, 
        user: userData,
        data: response.data 
      };
    
      } else {
        console.log('Login failed: Invalid response');
        return { success: false, error: 'Invalid response from server' };
      }
       
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Login failed';
        return { success: false, error: errorMessage };
      } else if (error.request) {
        return { success: false, error: 'Network error - please check your connection' };
      } else {
        return { success: false, error: 'An unexpected error occurred' };
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);