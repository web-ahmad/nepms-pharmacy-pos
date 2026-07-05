export const parseApiError = (error: any): string => {
  if (!error) return "An unexpected error occurred.";
  
  // Extract detail from axios/fetch response
  const detail = error.response?.data?.detail || error.detail;
  
  if (!detail) {
    return error.message || "An unexpected error occurred.";
  }

  // If detail is a FastAPI validation error array
  if (Array.isArray(detail)) {
    return detail.map((err: any) => err.msg || "Validation error").join(', ');
  }

  // If detail is a string
  if (typeof detail === 'string') {
    return detail;
  }

  // Fallback if detail is an object but not an array
  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }

  return "An unexpected error occurred.";
};
