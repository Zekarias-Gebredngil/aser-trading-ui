// Dynamically resolve API URL so devices on the same local network (LAN) connect to the host IP
const resolveApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8085/api/v1`;
    }
  }
  return 'http://localhost:8085/api/v1';
};

export const environment = {
  production: false,
  apiUrl: resolveApiUrl()
};
