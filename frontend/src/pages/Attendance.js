import '../styles/style.css';

export function Attendance() {
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
            <li><a href="/attendance" class="border-b-2">Attendance</a></li>
            <li><a href="/reports">Reports</a></li>
            <li><a href="#" class="logout">Logout</a></li>
          </ul>
        </nav>
      </header>
      <main class="content">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800">Attendance Records</h2>
        <div class="filters mb-4 flex flex-col sm:flex-row gap-4">
          <div class="date-filter">
            <label for="date-filter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
            <input type="date" id="date-filter" class="px-3 py-2 border border-gray-300 rounded-md shadow-sm">
          </div>
          <button id="reset-filter" class="reset-filter">
            Reset Filter
          </button>
        </div>
        <div class="table-container bg-white shadow-lg rounded-lg p-6">
          <table class="attendance-table w-full text-left">
            <thead>
              <tr class="border-b">
                <th class="py-3 px-4 text-gray-600 font-semibold">Name</th>
                <th class="py-3 px-4 text-gray-600 font-semibold">RFID Tag</th>
                <th class="py-3 px-4 text-gray-600 font-semibold">Scan Time</th>
                <th class="py-3 px-4 text-gray-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody id="attendance-rows">
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
    let filteredData = [];

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');
    const paginationInfo = document.querySelector('.pagination-info');
    const dateFilter = document.getElementById('date-filter');
    const resetFilter = document.getElementById('reset-filter');

    // Set max date to today (no future dates)
    dateFilter.max = new Date().toISOString().split('T')[0];

    function filterByDate(date) {
      if (!date) return allData;
      
      const selectedDate = new Date(date);
      return allData.filter(record => {
        const recordDate = new Date(record.scan_time).toDateString();
        return recordDate === selectedDate.toDateString();
      });
    }

    function displayData(page, data = filteredData) {
        const tbody = document.getElementById('attendance-rows');
        if (!tbody) return;
      
        const startIndex = (page - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedData = data.slice(startIndex, endIndex);
      
        tbody.innerHTML = paginatedData.map(row => `
          <tr class="border-b hover:bg-gray-50">
            <td class="py-3 px-4">${row.name}</td>
            <td class="py-3 px-4">${row.rfid_tag}</td>
            <td class="py-3 px-4">${new Date(row.scan_time).toLocaleString()}</td>
            <td class="py-3 px-4">
              <span class="inline-block px-3 py-1 rounded-full text-sm font-medium 
                ${row.status === 'Present' ? 
                  'bg-green-100 text-green-800' : 
                  'bg-red-100 text-red-800'}">
                ${row.status}
              </span>
            </td>
          </tr>
        `).join('');
      
        // Update pagination info
        const totalPages = Math.ceil(data.length / recordsPerPage);
        paginationInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, data.length)} of ${data.length} records`;
      
        // Update pagination buttons
        prevBtn.disabled = page === 1 || data.length === 0;
        nextBtn.disabled = page === totalPages || data.length === 0;
      
        // Update page numbers
        pageNumbers.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
          const pageBtn = document.createElement('button');
          pageBtn.className = `px-3 py-1 rounded ${i === page ? 'bg-blue-500 text-white' : 'bg-gray-200'}`;
          pageBtn.textContent = i;
          pageBtn.addEventListener('click', () => {
            currentPage = i;
            displayData(currentPage, filteredData);
          });
          pageNumbers.appendChild(pageBtn);
        }
      }

    // Fetch data and initialize
    fetch('http://localhost:3000/api/attendance')
   // fetch('https://rfid-attendance-backend.onrender.com/api/attendance')
      .then(res => res.json())
      .then(data => {
        allData = data;
        filteredData = [...allData];
        displayData(currentPage);
      })
      .catch(err => console.error('Fetch error:', err));

    // Date filter event listener
    dateFilter.addEventListener('change', (e) => {
      currentPage = 1;
      filteredData = filterByDate(e.target.value);
      displayData(currentPage, filteredData);
    });

    // Reset filter event listener
    resetFilter.addEventListener('click', () => {
      currentPage = 1;
      dateFilter.value = '';
      filteredData = [...allData];
      displayData(currentPage);
    });

    // Pagination button event listeners
    prevBtn?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        displayData(currentPage, filteredData);
      }
    });

    nextBtn?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredData.length / recordsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        displayData(currentPage, filteredData);
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