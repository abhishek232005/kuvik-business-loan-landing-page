async function fetchApi(url, options) {
  try {
    return await fetch(url, options);
  } catch (cause) {
    throw new Error(
      "Cannot reach the Kuvik Loans API. Check that the backend is running and its port matches VITE_API_BASE_URL.",
      { cause },
    );
  }
}

async function request(path, options = {}) {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
  const response = await fetchApi(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Something went wrong. Please try again.");
    error.status = response.status;
    if (Number.isInteger(payload.retryAfterSeconds) && payload.retryAfterSeconds > 0) {
      error.retryAfterSeconds = payload.retryAfterSeconds;
    }
    throw error;
  }
  return payload;
}

export const api = {
  sendOtp: (body) => request("/otp/send", { method: "POST", body }),
  verifyOtp: (body) => request("/otp/verify", { method: "POST", body }),
  createBusinessLoan: (body, token) =>
    request("/business-loans", { method: "POST", body, token }),
  updateBusinessLoan: (id, body, token) =>
    request(`/business-loans/${encodeURIComponent(id)}`, { method: "PATCH", body, token }),
};
