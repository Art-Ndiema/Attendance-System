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
          <div class="card" id="total-card">
            <span class="icon text-green-500">👥</span>
            <h2 id="total-students">0</h2>
            <p>Total Students</p>
            <div class="card-details hidden" id="total-details">
              <h4>Registered Students</h4>
              <ul id="students-list" class="student-list">
                <!-- Will be populated dynamically -->
              </ul>
            </div>
          </div>
          <div class="card" id="present-card">
            <span class="icon text-green-500">✅</span>
            <h2 id="present-today">0</h2>
            <p>Present Today</p>
            <div class="card-details hidden" id="present-details">
              <h4>Present Students</h4>
              <ul id="present-list" class="student-list">
                <!-- Will be populated dynamically -->
              </ul>
            </div>
          </div>
          <div class="card" id="absent-card">
            <span class="icon text-red-500">❌</span>
            <h2 id="absent-today">0</h2>
            <p>Absent Today</p>
            <div class="card-details hidden" id="absent-details">
              <h4>Absent Students</h4>
              <ul id="absent-list" class="student-list">
                <!-- Will be populated dynamically -->
              </ul>
            </div>
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

    <!-- Add some CSS for the details view -->
    <style>
      .card {
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      }
      
      .card-details {
        background: #f9f9f9;
        border-top: 1px solid #e2e8f0;
        padding: 15px;
        margin-top: 15px;
        border-radius: 0 0 8px 8px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .card-details h4 {
        font-size: 16px;
        margin-bottom: 10px;
        color: #2d3748;
      }
      
      .student-list {
        list-style: none;
        padding: 0;
      }
      
      .student-list li {
        padding: 8px 0;
        border-bottom: 1px solid #edf2f7;
        font-size: 14px;
      }
      
      .student-list li:last-child {
        border-bottom: none;
      }
      
      .hidden {
        display: none;
      }
      
      .expanded {
        height: auto;
        transform: none !important;
      }
    </style>
  `;

  function init() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      window.location.href = '/login';
      return;
    }

    // Get selected date from input or use today's date
    const dateInput = document.getElementById('attendance-date');
    const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
    
    // Add event listener for date changes
    dateInput?.addEventListener('change', (e) => {
      fetchDashboardData(e.target.value);
    });

    // Initial data fetch
    fetchDashboardData(selectedDate);

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

    // Make cards clickable to show details
    setupCardInteractions();
  }

  function fetchDashboardData(selectedDate) {
    const authToken = localStorage.getItem('authToken');
    
    // API URL with date parameter
    const url = selectedDate 
      ? `http://localhost:3000/api/dashboard?date=${selectedDate}`
      : 'http://localhost:3000/api/dashboard';
    
    // Fetch dashboard data
    fetch(url, {
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
        
        // Update stats
        document.querySelector('#total-students').textContent = data.total || 0;
        document.querySelector('#present-today').textContent = data.present || 0;
        document.querySelector('#absent-today').textContent = data.absent || 0;

        // Create chart with correct data
        updateChart(data);
        
        // Fetch student details for the cards
        fetchStudentDetails(selectedDate);
      })
      .catch(err => console.error('Fetch error:', err));
  }

  function updateChart(data) {
    const ctx = document.getElementById('attendanceChart')?.getContext('2d');
    if (!ctx) return;
    
    // Make sure we have proper numbers for both present and absent
    const presentCount = data.present || 0;
    const absentCount = data.absent || 0;
    
    // Create the chart
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [presentCount, absentCount],
          backgroundColor: ['#34D399', '#F87171'], // Green for present, red for absent
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
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = presentCount + absentCount;
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
      },
    });
  }

function fetchStudentDetails(selectedDate) {
  const authToken = localStorage.getItem('authToken');
  
  // Fetch all students
  fetch('http://localhost:3000/api/students', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
    .then(res => res.json())
    .then(allStudents => {
      // Populate total students list
      const totalList = document.getElementById('students-list');
      if (totalList) {
        totalList.innerHTML = allStudents.map(student => `
          <li>${student.name} (${student.rfid_tag})</li>
        `).join('');
      }
      
      // Fetch attendance for the selected date
      const url = selectedDate 
        ? `http://localhost:3000/api/attendance?date=${selectedDate}`
        : 'http://localhost:3000/api/attendance';
        
      return fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
        .then(res => res.json())
        .then(attendance => {
          console.log('All students:', allStudents);
          console.log('Attendance records:', attendance);
          
          // Create a set of student names who are present
          const presentStudentNames = new Set();
          attendance.forEach(record => {
            presentStudentNames.add(record.name);
          });
          
          console.log('Present student names:', [...presentStudentNames]);
          
          // Filter students into present and absent lists
          const presentStudents = allStudents.filter(student => 
            presentStudentNames.has(student.name)
          );
          
          const absentStudents = allStudents.filter(student => 
            !presentStudentNames.has(student.name)
          );
          
          console.log('Present students:', presentStudents);
          console.log('Absent students:', absentStudents);
          
          // Populate the present students list
          const presentList = document.getElementById('present-list');
          if (presentList) {
            if (presentStudents.length === 0) {
              presentList.innerHTML = '<li>No students present</li>';
            } else {
              presentList.innerHTML = presentStudents.map(student => `
                <li>${student.name} (${student.rfid_tag})</li>
              `).join('');
            }
          }
          
          // Populate the absent students list
          const absentList = document.getElementById('absent-list');
          if (absentList) {
            if (absentStudents.length === 0) {
              absentList.innerHTML = '<li>No students absent</li>';
            } else {
              absentList.innerHTML = absentStudents.map(student => `
                <li>${student.name} (${student.rfid_tag})</li>
              `).join('');
            }
          }
        });
    })
    .catch(err => console.error('Failed to fetch student details:', err));
}

  function setupCardInteractions() {
    // Add click handlers to each card
    document.getElementById('total-card')?.addEventListener('click', function() {
      toggleCardDetails('total-details', this);
    });
    
    document.getElementById('present-card')?.addEventListener('click', function() {
      toggleCardDetails('present-details', this);
    });
    
    document.getElementById('absent-card')?.addEventListener('click', function() {
      toggleCardDetails('absent-details', this);
    });
  }

  function toggleCardDetails(detailsId, cardElement) {
    const detailsElement = document.getElementById(detailsId);
    if (!detailsElement) return;
    
    // Toggle the details visibility
    detailsElement.classList.toggle('hidden');
    
    // Toggle expanded class on the card
    cardElement.classList.toggle('expanded');
    
    // If opening this card, close others
    if (!detailsElement.classList.contains('hidden')) {
      const allDetails = document.querySelectorAll('.card-details');
      const allCards = document.querySelectorAll('.card');
      
      allDetails.forEach(detail => {
        if (detail.id !== detailsId) {
          detail.classList.add('hidden');
        }
      });
      
      allCards.forEach(card => {
        if (card !== cardElement) {
          card.classList.remove('expanded');
        }
      });
    }
  }

  return { html, init };
}