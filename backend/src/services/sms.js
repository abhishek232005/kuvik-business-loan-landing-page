import config from "../config/env.js";

function requireMsg91Config() {
  const { provider, url, token, templateId, testMode } = config.sms;
  if (testMode || provider === "test") return false;
  if (provider !== "msg91" || !url || !token || !templateId) {
    throw new Error("SMS verification is not configured. Configure an approved live SMS provider or use local development test mode.");
  }
  return true;
}

function endpoint(path, params) {
  const url = new URL(config.sms.url);
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = path ? `${basePath}/${path}` : basePath;
  url.search = "";
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

async function requestMsg91(url, options) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { authkey: config.sms.token, ...(options.headers || {}) },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("Could not connect to MSG91. Check the provider connection and try again.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("MSG91 returned an unreadable response. Please try again.");
  }
  if (!response.ok) {
    throw new Error("MSG91 rejected the request. Check the Auth Key, OTP template and account configuration.");
  }
  return result;
}

export async function sendVerificationCode(mobile, code) {
  const { provider, url, token, templateId, testMode } = config.sms;
  if (testMode || provider === "test") return { mode: "test" };
  if (provider === "http") {
    if (!url || !token || !templateId) {
      throw new Error("SMS verification is not configured. Set the SMS API URL, token and template ID in backend/.env.");
    }
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: `+91${mobile}`,
          otp: code,
          senderId: config.sms.senderId,
          templateId,
          variables: { expiryMinutes: 5 },
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new Error("The verification message could not be sent. Check the SMS provider connection and try again.");
    }
    if (!response.ok) {
      throw new Error("The verification message could not be sent. Check the SMS provider configuration and try again.");
    }
    return { mode: "live" };
  }
  requireMsg91Config();
  const result = await requestMsg91(
    endpoint("", { template_id: templateId, mobile: `91${mobile}`, otp_length: "4" }),
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
  );
  if (result.type !== "success") {
    throw new Error("MSG91 did not accept the OTP request. Check the approved OTP template and account.");
  }
  return { mode: "live" };
}

export async function verifyVerificationCode(mobile, code) {
  if (!requireMsg91Config()) {
    throw new Error("Local test OTP verification is unavailable through the live SMS provider.");
  }
  const result = await requestMsg91(
    endpoint("verify", { mobile: `91${mobile}`, otp: code }),
    { method: "GET" },
  );
  if (result.type === "success") return true;
  const message = typeof result.message === "string" ? result.message.toLowerCase() : "";
  if (message.includes("otp") && ["invalid", "incorrect", "wrong", "not verified", "expired"].some((term) => message.includes(term))) {
    return false;
  }
  throw new Error("MSG91 could not verify the code. Check the provider configuration and try again.");
}
