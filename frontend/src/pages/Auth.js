// src/pages/Auth.js
export function Auth() {
    const html = `
      <div class="auth-container">
        <div class="auth-card">
          <h1>RFID Attendance System</h1>
          <form id="login-form">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" id="username" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" required>
            </div>
            <button type="submit" class="btn-login">Sign In</button>
          </form>
          <div id="auth-error" class="error-message"></div>
        </div>
      </div>
    `;
  
    function init() {
      const loginForm = document.getElementById('login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          
          try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              localStorage.setItem('authToken', data.token);
              localStorage.setItem('admin', JSON.stringify(data.admin));
              window.location.href = '/';
            } else {
              showError(data.error || 'Login failed');
            }
          } catch (error) {
            showError('Network error. Please try again.');
          }
        });
      }
    }
  
    function showError(message) {
      const errorEl = document.getElementById('auth-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    }
  
    return { html, init };
  }