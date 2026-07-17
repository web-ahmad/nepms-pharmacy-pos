export const parseApiError = (error: any): string => {
  if (!error) return "An unexpected error occurred.";
  
  // Extract detail from axios/fetch response
  const detail = error.response?.data?.detail || error.response?.data?.error || error.detail || error.error;
  
  if (!detail) {
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
    return "An unexpected error occurred.";
  }

  // If detail is a FastAPI validation error array
  if (Array.isArray(detail)) {
    try {
      return detail.map((err: any) => {
        if (typeof err === 'string') return err;
        if (err && typeof err === 'object' && err.msg) return String(err.msg);
        return "Validation error";
      }).join(', ');
    } catch (e) {
      return "Validation error";
    }
  }

  // If detail is a string
  if (typeof detail === 'string') {
    return detail;
  }

  // Fallback if detail is an object but not an array
  if (typeof detail === 'object') {
    try {
      return JSON.stringify(detail);
    } catch (e) {
      return "An unexpected error occurred.";
    }
  }

  return String(detail);
};
