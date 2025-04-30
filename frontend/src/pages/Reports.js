import '../styles/style.css';

export function Reports() {
  const html = `
    <div class="rfid-system-container min-h-screen">
      <div class="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <header>
        <h1>RFID Attendance System</h1>
        <nav>
          <ul>
            <li><a href="/">Dashboard</a></li>
            <li><a href="/attendance">Attendance</a></li>
            <li><a href="/reports" class="border-b-2">Reports</a></li>
            <li><a href="#" class="logout">Logout</a></li>
          </ul>
        </nav>
      </header>
      <main class="content">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800">Attendance Reports</h2>
        <div class="links">
          <button id="generate-report">Generate Report</button>
          <button id="export-csv">Export CSV</button>
        </div>
        <div class="table-container bg-white shadow-lg rounded-lg p-6 mt-4">
          <table class="attendance-table w-full text-left">
            <thead>
              <tr class="border-b">
                <th class="py-3 px-4 text-gray-600 font-semibold">Name</th>
                <th class="py-3 px-4 text-gray-600 font-semibold">RFID Tag</th>
                <th class="py-3 px-4 text-gray-600 font-semibold">Scan Time</th>
                <th class="py-3 px-4 text-gray-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody id="report-rows">
              <!-- Populated dynamically -->
            </tbody>
          </table>
          <div class="pagination-controls mt-4 flex justify-between items-center">
            <div class="pagination-info text-sm text-gray-600"></div>
            <div class="pagination-buttons flex space-x-2">
              <button id="prev-page" class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Previous</button>
              <div id="page-numbers" class="flex space-x-1"></div>
              <button id="next-page" class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  function init() {
    let currentPage = 1;
    const recordsPerPage = 10;
    let allData = [];

    const generateBtn = document.getElementById('generate-report');
    const exportBtn = document.getElementById('export-csv');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');
    const paginationInfo = document.querySelector('.pagination-info');

    function displayData(page) {
      const tbody = document.getElementById('report-rows');
      if (!tbody) return;
    
      // Check if allData is an array, if not, initialize as empty array
      if (!Array.isArray(allData)) {
        console.error('allData is not an array:', allData);
        allData = [];  // Fix by setting to empty array
      }
    
      const startIndex = (page - 1) * recordsPerPage;
      const endIndex = startIndex + recordsPerPage;
      const paginatedData = allData.slice(startIndex, endIndex);
    
      // If there's no data, show a message
      if (paginatedData.length === 0) {
        tbody.innerHTML = `
          <tr class="border-b">
            <td colspan="4" class="py-4 px-4 text-center text-gray-500">
              No attendance records found. Click "Generate Report" to fetch data.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = paginatedData.map(row => `
          <tr class="border-b hover:bg-gray-50">
            <td class="py-3 px-4">${row.name}</td>
            <td class="py-3 px-4">${row.rfid_tag}</td>
            <td class="py-3 px-4">${new Date(row.scan_time).toLocaleString()}</td>
            <td class="py-3 px-4">
              <span class="${row.status === 'Present' ? 'text-green-500' : 'text-red-500'} font-medium">
                ${row.status}
              </span>
            </td>
          </tr>
        `).join('');
      }
    
      // Update pagination info
      const totalPages = Math.ceil(allData.length / recordsPerPage);
      if (allData.length === 0) {
        paginationInfo.textContent = 'No records to display';
      } else {
        paginationInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, allData.length)} of ${allData.length} records`;
      }
    
      // Update pagination buttons
      prevBtn.disabled = page === 1 || allData.length === 0;
      nextBtn.disabled = page === totalPages || allData.length === 0;
    
      // Update page numbers
      pageNumbers.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `px-3 py-1 rounded ${i === page ? 'bg-blue-500 text-white' : 'bg-gray-200'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          displayData(currentPage);
        });
        pageNumbers.appendChild(pageBtn);
      }
    }

  
      //fetch('https://rfid-attendance-backend.onrender.com/api/attendance')
generateBtn?.addEventListener('click', () => {
  const authToken = localStorage.getItem('authToken');
  console.log('Auth token exists:', !!authToken);
  
  fetch('http://localhost:3000/api/attendance', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(res => {
    if (!res.ok) {
      if (res.status === 401) {
        console.log('Unauthorized - redirecting to login');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      return res.text().then(text => {
        throw new Error(text || `HTTP error ${res.status}`);
      });
    }
    return res.json();
  })
  .then(data => {
    console.log('Data received:', data);
    allData = data || [];  // Ensure it's an array
    currentPage = 1;
    displayData(currentPage);
  })
  .catch(err => {
    if (err.message !== 'Unauthorized') {
      console.error('Fetch error:', err);
    }
  });
});

exportBtn?.addEventListener('click', () => {
  const authToken = localStorage.getItem('authToken');
  
  fetch('http://localhost:3000/api/attendance', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(res => {
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      return res.text().then(text => {
        throw new Error(text || `HTTP error ${res.status}`);
      });
    }
    return res.json();
  })
  .then(data => {
    if (!Array.isArray(data)) {
      console.error('Expected array but got:', data);
      data = [];
    }
    
    // In your CSV export code in Reports.js
const csvRows = [
  ['Name', 'RFID Tag', 'Date', 'Time', 'Status'],
  ...data.map(row => {
    const scanDateTime = new Date(row.scan_time);
    const dateStr = scanDateTime.toLocaleDateString();
    const timeStr = scanDateTime.toLocaleTimeString();
    
    return [
      row.name,
      row.rfid_tag,
      dateStr,
      timeStr,
      row.status
    ];
  })
];

    const csvContent = csvRows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_report.csv');
    link.click();
  })
  .catch(err => {
    if (err.message !== 'Unauthorized') {
      console.error('CSV Export error:', err);
    }
  });
});

    prevBtn?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        displayData(currentPage);
      }
    });

    nextBtn?.addEventListener('click', () => {
      const totalPages = Math.ceil(allData.length / recordsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        displayData(currentPage);
      }
    });

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