const parseApiError = (error) => {
  if (!error) return "An unexpected error occurred.";
  const detail = error.response?.data?.detail || error.detail;
  if (!detail) {
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
    return "An unexpected error occurred.";
  }
  if (Array.isArray(detail)) {
    try {
      return detail.map((err) => {
        if (typeof err === 'string') return err;
        if (err && typeof err === 'object' && err.msg) return String(err.msg);
        return "Validation error";
      }).join(', ');
    } catch (e) {
      return "Validation error";
    }
  }
  if (typeof detail === 'string') { return detail; }
  if (typeof detail === 'object') {
    try { return JSON.stringify(detail); } catch (e) { return "An unexpected error occurred."; }
  }
  return String(detail);
};

const mockError = {
  response: {
    data: {
      detail: [
        { type: "missing", loc: ["body", "supplier_id"], msg: "Field required", input: null, ctx: {} }
      ]
    }
  }
};

console.log("Output is:", typeof parseApiError(mockError), parseApiError(mockError));
