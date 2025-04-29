// Create this file as: frontend/src/services/api.js

// API base URL configuration
// This allows switching between local development and deployed backend
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://rfid-attendance-backend.onrender.com' 
  : 'http://localhost:3000';

// Fetch dashboard data
export async function fetchDashboardData(date = null) {
  const url = date 
    ? `${API_URL}/api/dashboard?date=${date}` 
    : `${API_URL}/api/dashboard`;
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  
  return response.json();
}

// Fetch attendance records
export async function fetchAttendanceRecords(date = null) {
  const url = date 
    ? `${API_URL}/api/attendance?date=${date}` 
    : `${API_URL}/api/attendance`;
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch attendance records');
  }
  
  return response.json();
}

// Export attendance as CSV
export async function exportAttendanceCSV() {
  const data = await fetchAttendanceRecords();
  
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
}