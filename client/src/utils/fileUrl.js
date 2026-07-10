/**
 * Resolve relative/absolute file URLs using the VITE_API_URL environment variable.
 * @param {string} url - The URL or path to resolve.
 * @returns {string} The fully qualified URL.
 */
export const getFileUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const baseUrl = apiBase.replace('/api/v1', '').replace(/\/+$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanUrl}`;
};
