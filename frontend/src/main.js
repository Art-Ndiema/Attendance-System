// src/main.js
import { Auth } from './pages/Auth.js';
import { Attendance } from './pages/Attendance.js';
import { Dashboard } from './pages/Dashboard.js';
import { Reports } from './pages/Reports.js';
import './styles/style.css';

const app = document.querySelector('#app');
const path = window.location.pathname;

const renderPage = (path) => {
  const publicRoutes = ['/login'];
  const authToken = localStorage.getItem('authToken');
  
  if (!publicRoutes.includes(path) && !authToken) {
    window.location.href = '/login';
    return;
  }

  let page;
  if (path === '/login') {
    page = Auth();
  } else if (path === '/attendance') {
    page = Attendance();
  } else if (path === '/reports') {
    page = Reports();
  } else {
    page = Dashboard();
  }
  
  if (app) {
    app.innerHTML = page.html;
    page.init();
  } else {
    console.error('App container #app not found');
  }
};

renderPage(path);

// Handle navigation
window.addEventListener('popstate', () => {
  renderPage(window.location.pathname);
});

// Intercept link clicks for SPA navigation
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.href.startsWith(window.location.origin)) {
    e.preventDefault();
    const newPath = link.pathname;
    history.pushState({}, '', newPath);
    renderPage(newPath);
  }
  
  // Handle logout
  if (e.target.classList.contains('logout')) {
    e.preventDefault();
    localStorage.removeItem('authToken');
    localStorage.removeItem('admin');
    window.location.href = '/login';
  }
});