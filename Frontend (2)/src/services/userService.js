const API_URL = 'http://localhost:50447/api/Users';

export const getAllUsers = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return await response.json();
};

export const getUserById = async (userID) => {
  const response = await fetch(`${API_URL}/${userID}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return await response.json();
};

export const createUser = async (userData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create user');
  }
  
  return await response.json();
};

export const updateUser = async (userID, userData) => {
  const response = await fetch(`${API_URL}/${userID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update user');
  }
  
  return await response.json();
};

export const getStudents = async () => {
  const response = await fetch(`${API_URL}/students`);  
  if (!response.ok) {
    throw new Error('Failed to fetch students');
  }
  return await response.json();
};