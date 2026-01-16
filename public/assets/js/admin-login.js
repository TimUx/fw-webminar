const API_BASE = '/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('errorMessage');
  
  errorDiv.classList.add('hidden');
  
  try {
    // Try to login first
    let response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    // If login fails with 401, try setup (for first-time use)
    if (response.status === 401) {
      response = await fetch(`${API_BASE}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (response.ok) {
        // Setup successful, now login
        response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      }
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login fehlgeschlagen');
    }
    
    const data = await response.json();
    
    // Store token
    localStorage.setItem('adminToken', data.token);
    
    // Redirect to admin panel
    window.location.href = '/admin/';
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');
  }
});
