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

      const startIndex = (page - 1) * recordsPerPage;
      const endIndex = startIndex + recordsPerPage;
      const paginatedData = allData.slice(startIndex, endIndex);

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

      // Update pagination info
      const totalPages = Math.ceil(allData.length / recordsPerPage);
      paginationInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, allData.length)} of ${allData.length} records`;

      // Update pagination buttons
      prevBtn.disabled = page === 1;
      nextBtn.disabled = page === totalPages;

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

    generateBtn?.addEventListener('click', () => {
      fetch('http://localhost:3000/api/attendance')
      //fetch('https://rfid-attendance-backend.onrender.com/api/attendance')
        .then(res => res.json())
        .then(data => {
          allData = data;
          currentPage = 1;
          displayData(currentPage);
        })
        .catch(err => console.error('Fetch error:', err));
    });

    exportBtn?.addEventListener('click', () => {
    fetch('http://localhost:3000/api/attendance')
//fetch('https://rfid-attendance-backend.onrender.com/api/attendance')
        .then(res => res.json())
        .then(data => {
          const csvRows = [
            ['Name', 'RFID Tag', 'Scan Time', 'Status'],
            ...data.map(row => [
              row.name,
              row.rfid_tag,
              new Date(row.scan_time).toLocaleString(),
              row.status
            ])
          ];

          const csvContent = csvRows.map(e => e.join(',')).join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', 'attendance_report.csv');
          link.click();
        })
        .catch(err => console.error('CSV Export error:', err));
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