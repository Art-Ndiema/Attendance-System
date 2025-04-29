// src/pages/Dashboard.js
import { Chart } from 'chart.js/auto';
import '../styles/style.css';

Chart.register({ id: 'doughnut' });

export function Dashboard() {
  const admin = JSON.parse(localStorage.getItem('admin')) || {};
  
  const html = `
    <div class="rfid-system-container min-h-screen">
      <div class="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <header>
        <h1>RFID Attendance System</h1>
        <div class="admin-info">
          <span>Welcome, ${admin.fullName || 'Admin'}</span>
        </div>
        <nav>
          <ul>
            <li><a href="/" class="border-b-2">Dashboard</a></li>
            <li><a href="/attendance">Attendance</a></li>
            <li><a href="/reports">Reports</a></li>
            <li><a href="#" class="logout">Logout</a></li>
          </ul>
        </nav>
      </header>
      <main class="content">
        <div class="date-filter">
          <label for="attendance-date">Select Date:</label>
          <input type="date" id="attendance-date" max="${new Date().toISOString().split('T')[0]}" />
        </div>

        <div class="cards">
          <div class="card">
            <span class="icon text-green-500">👥</span>
            <h2 id="total-students">0</h2>
            <p>Total Students</p>
          </div>
          <div class="card">
            <span class="icon text-green-500">✅</span>
            <h2 id="present-today">0</h2>
            <p>Present Today</p>
          </div>
          <div class="card">
            <span class="icon text-red-500">❌</span>
            <h2 id="absent-today">0</h2>
            <p>Absent Today</p>
          </div>
        </div>
        <div class="chart">
          <h3>Attendance Breakdown</h3>
          <canvas id="attendanceChart"></canvas>
        </div>
        <div class="links">
          <a href="/attendance">View Attendance</a>
          <a href="/reports">Generate Report</a>
        </div>
      </main>
    </div>
  `;

  function init() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      window.location.href = '/login';
      return;
    }

    fetch('http://localhost:3000/api/dashboard', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        
        document.querySelector('#total-students').textContent = data.total || 0;
        document.querySelector('#present-today').textContent = data.present || 0;
        document.querySelector('#absent-today').textContent = data.absent || 0;

        const ctx = document.getElementById('attendanceChart')?.getContext('2d');
        if (ctx) {
          new Chart(ctx, {
            type: 'pie',
            data: {
              labels: ['Absent', 'Present'],
              datasets: [{
                data: [data.chart.Absent || 0, data.chart.Present || 0],
                backgroundColor: ['#F87171', '#34D399'],
                borderColor: ['#FFFFFF', '#FFFFFF'],
                borderWidth: 2,
              }],
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    font: {
                      size: 14,
                      family: 'Poppins',
                    },
                    color: '#2D3748',
                  },
                },
              },
            },
          });
        }
      })
      .catch(err => console.error('Fetch error:', err));

    // Hamburger menu toggle
    const hamburger = document.querySelector('.hamburger');
    const header = document.querySelector('header');

    if (hamburger && header) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        header.classList.toggle('active');
      });

      document.querySelectorAll('header nav ul li a').forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          header.classList.remove('active');
        });
      });
    }
  }

  return { html, init };
}