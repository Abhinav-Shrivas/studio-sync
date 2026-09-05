/**
 * Central API client for interacting with the backend.
 * Automatically injects the JWT token from localStorage and parses response data and errors.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Body was not JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  const json = await response.json();
  if (json && json.pagination !== undefined) {
    return {
      data: json.data,
      pagination: json.pagination,
      bookings: json.data,
    };
  }
  return json.data !== undefined ? json.data : json;
}

/**
 * Downloads a binary or CSV file directly by sending credentials and triggering browser save.
 */
export async function downloadFile(endpoint, defaultFilename = 'download.csv') {
  const token = localStorage.getItem('token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!response.ok) {
    let msg = 'Failed to download file';
    try {
      const errJson = await response.json();
      if (errJson.message) msg = errJson.message;
    } catch {
      // not json
    }
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  const disposition = response.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
