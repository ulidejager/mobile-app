let BACKEND_URL = 'http://192.168.0.185:8081'; // e.g., http://192.168.1.5:8081

// Optional: if running on web in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  BACKEND_URL = 'http://localhost:8081';
}

export default BACKEND_URL;
