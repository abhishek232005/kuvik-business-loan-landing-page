import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { api } from "../api.js";

const inputClass =
  "mt-2 w-full rounded-xl border border-forest/15 bg-white px-4 py-3 text-sm text-forest outline-none transition placeholder:text-muted/70 focus:border-forest focus:ring-2 focus:ring-forest/10";

const businessTypes = [
  ["sole_proprietorship", "Sole proprietorship"],
  ["partnership", "Partnership"],
  ["llp", "LLP"],
  ["private_limited", "Private limited company"],
  ["public_limited", "Public limited company"],
  ["other", "Other"],
];

const businessVintages = [
  ["under_1_year", "Under 1 year"],
  ["1_to_3_years", "1–3 years"],
  ["3_to_5_years", "3–5 years"],
  ["over_5_years", "Over 5 years"],
];

const purposes = [
  ["working_capital", "Working capital"],
  ["equipment", "Equipment or machinery"],
  ["expansion", "Business expansion"],
  ["inventory", "Inventory purchase"],
  ["operational_expenses", "Operational expenses"],
  ["other", "Other business purpose"],
];

function formatRetryTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function Field({ label, name, type = "text", value, onChange, placeholder, required = true, ...props }) {
  return (
    <label className="block text-sm font-medium text-forest">
      {label}
      <input
        className={inputClass}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        {...props}
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <label className="block text-sm font-medium text-forest">
      {label}
      <select className={inputClass} name={name} value={value} onChange={onChange} required>
        <option value="">Select an option</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

export default function BusinessLoanLeadForm({ onClose, requestedAmount }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    otp: "",
    consent: false,
    businessName: "",
    businessType: "",
    businessVintage: "",
    monthlyRevenue: "",
    financingPurpose: "",
    requestedAmount: String(requestedAmount),
    city: "",
    state: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [leadToken, setLeadToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [otpRetryAfter, setOtpRetryAfter] = useState(0);
  const [otpRateLimitMessage, setOtpRateLimitMessage] = useState(false);
  const [success, setSuccess] = useState(false);
  const [crmSyncStatus, setCrmSyncStatus] = useState("unknown");
  const validName = /^[\p{L}\p{M} .'-]+$/u.test(form.name.trim()) && form.name.trim().length >= 2;

  useEffect(() => {
    if (otpRetryAfter <= 0) {
      if (otpRateLimitMessage) {
        setError("");
        setOtpRateLimitMessage(false);
      }
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setOtpRetryAfter((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpRetryAfter, otpRateLimitMessage]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const sendOtp = async () => {
    if (busy || otpRetryAfter > 0) return;
    setError("");
    setOtpRateLimitMessage(false);
    setBusy(true);
    try {
      const result = await api.sendOtp({
        mobile: form.mobile,
        consent: form.consent,
        applicationType: "business",
      });
      setOtpSent(true);
      setOtpRetryAfter(result.resendAfterSeconds || 60);
    } catch (requestError) {
      if (requestError.retryAfterSeconds) {
        setOtpRetryAfter(requestError.retryAfterSeconds);
        setOtpRateLimitMessage(true);
      }
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyAndCreate = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const verification = await api.verifyOtp({ mobile: form.mobile, otp: form.otp });
      const application = await api.createBusinessLoan(
        { name: form.name, mobile: form.mobile, consent: form.consent },
        verification.verificationToken,
      );
      setLeadId(application.leadId);
      setLeadToken(application.leadToken);
      setStep(2);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const submitDetails = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api.updateBusinessLoan(
        leadId,
        {
          businessName: form.businessName,
          businessType: form.businessType,
          businessVintage: form.businessVintage,
          monthlyRevenue: form.monthlyRevenue ? Number(form.monthlyRevenue) : null,
          financingPurpose: form.financingPurpose,
          requestedAmount: Number(form.requestedAmount),
          city: form.city,
          state: form.state,
        },
        leadToken,
      );
      if (result.status !== "submitted") {
        throw new Error("We could not confirm that your enquiry was recorded. Please try again.");
      }
      setCrmSyncStatus(result.crmSyncStatus || "unknown");
      setSuccess(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (!busy) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-forest/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-application-title"
        className="business-modal-enter relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-[#fcfcf8] p-6 shadow-2xl sm:rounded-[2rem] sm:p-8"
      >
        <button onClick={close} aria-label="Close application form" className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-forest/5 text-forest hover:bg-forest/10">
          <X size={18} />
        </button>
        {success ? (
          <div className="px-1 py-8 text-center sm:px-4 sm:py-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eff4e7] text-emerald-800 ring-8 ring-[#eff4e7]/60">
              <CheckCircle2 size={32} aria-hidden="true" />
            </span>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Enquiry recorded</p>
            <h2 id="business-application-title" className="mt-3 text-2xl font-semibold tracking-tight text-forest sm:text-3xl">
              Thank you, {form.name.trim()}.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-muted sm:text-base sm:leading-7">
              Your Business Loan enquiry has been recorded by the application. A lending partner will make any eligibility or offer decision.
            </p>
            <p role="status" className="mx-auto mt-4 max-w-lg rounded-2xl bg-amber-50 px-4 py-3 text-left text-xs leading-5 text-amber-950">
              {crmSyncStatus === "pending"
                ? "CRM delivery is pending and has not been confirmed yet."
                : crmSyncStatus === "disabled"
                  ? "CRM synchronization is not configured. We cannot confirm that this enquiry reached the CRM."
                  : "CRM delivery could not be confirmed by this response."}
            </p>
            <button onClick={onClose} className="mt-8 w-full rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-forest/90 sm:w-auto">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Business Loan enquiry</p>
            <h2 id="business-application-title" className="mt-2 pr-8 text-2xl font-semibold tracking-tight text-forest">
              Start with the essentials.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">Your enquiry is not a loan approval or offer.</p>
            <div className="mt-6 flex items-center gap-3" aria-label={`Step ${step} of 2`}>
              {[1, 2].map((item) => (
                <div key={item} className="flex flex-1 items-center gap-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step >= item ? "bg-forest text-white" : "bg-forest/10 text-muted"}`}>
                    {item < step ? <CheckCircle2 size={15} /> : item}
                  </span>
                  <span className={`text-xs font-medium ${step >= item ? "text-forest" : "text-muted"}`}>
                    {item === 1 ? "Verify mobile" : "Business details"}
                  </span>
                  {item === 1 && <span className="h-px flex-1 bg-forest/15" />}
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {otpRateLimitMessage && otpRetryAfter > 0
                  ? `Please wait ${formatRetryTime(otpRetryAfter)} before requesting another code.`
                  : error}
              </p>
            )}

            {step === 1 ? (
              <form onSubmit={verifyAndCreate} className="mt-6 space-y-4">
                <Field label="Your full name" name="name" value={form.name} onChange={change} placeholder="Full name" autoComplete="name" maxLength={80} />
                <label className="block text-sm font-medium text-forest">
                  Mobile number
                  <div className="mt-2 flex gap-2">
                    <span className="grid place-items-center rounded-xl border border-forest/15 bg-forest/5 px-3 text-sm text-forest">+91</span>
                    <input className={`${inputClass} mt-0`} name="mobile" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit mobile number" required minLength={10} maxLength={10} pattern="[6-9][0-9]{9}" />
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f1f3ed] p-3.5 text-xs leading-5 text-muted">
                  <input type="checkbox" name="consent" checked={form.consent} onChange={change} className="mt-1 h-4 w-4 shrink-0 accent-forest" required />
                  <span>
                    I consent to Kuvik Loans processing my details for this Business Loan enquiry and contacting me about it. I have read the{" "}
                    <a className="font-semibold text-forest underline" href="/privacy" target="_blank" rel="noreferrer">privacy notice</a>.
                    I understand that an enquiry does not guarantee approval.
                  </span>
                </label>
                {!otpSent ? (
                  <button type="button" onClick={sendOtp} disabled={busy || otpRetryAfter > 0 || !form.consent || !validName || !/^[6-9]\d{9}$/.test(form.mobile)} className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? <><LoaderCircle className="mr-2 inline animate-spin" size={16} /> Sending code</> : otpRetryAfter > 0 ? <>Try again in {formatRetryTime(otpRetryAfter)}</> : <>Send verification code <ArrowRight className="ml-2 inline" size={16} /></>}
                  </button>
                ) : (
                  <>
                    <Field label="One-time verification code" name="otp" value={form.otp} onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="Enter the 4-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} minLength={4} pattern="[0-9]{4}" />
                    <p className="text-xs leading-5 text-muted">
                      Code sent to your number. It expires in 5 minutes.{" "}
                      <button type="button" onClick={sendOtp} disabled={busy || otpRetryAfter > 0} className="font-semibold text-forest underline disabled:opacity-50">
                        {otpRetryAfter > 0 ? `Resend in ${formatRetryTime(otpRetryAfter)}` : "Resend code"}
                      </button>
                    </p>
                    <button type="submit" disabled={busy || form.otp.length !== 4} className="w-full rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                      {busy ? <><LoaderCircle className="mr-2 inline animate-spin" size={16} /> Verifying</> : <>Verify and continue <ArrowRight className="ml-2 inline" size={16} /></>}
                    </button>
                  </>
                )}
              </form>
            ) : (
              <form onSubmit={submitDetails} className="mt-6 space-y-4">
                <Field label="Business or trading name" name="businessName" value={form.businessName} onChange={change} placeholder="Name of your business" maxLength={120} autoComplete="organization" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="Business type" name="businessType" value={form.businessType} onChange={change} options={businessTypes} />
                  <SelectField label="Time in business" name="businessVintage" value={form.businessVintage} onChange={change} options={businessVintages} />
                  <Field label="Monthly revenue (optional)" name="monthlyRevenue" type="number" value={form.monthlyRevenue} onChange={change} placeholder="Enter amount in ₹" min="1" max="999999999999" step="1" required={false} />
                  <SelectField label="Financing purpose" name="financingPurpose" value={form.financingPurpose} onChange={change} options={purposes} />
                  <Field label="Requested amount (₹)" name="requestedAmount" type="number" value={form.requestedAmount} onChange={change} min="10000" max="999999999999" step="1" />
                  <Field label="City" name="city" value={form.city} onChange={change} placeholder="City" maxLength={80} autoComplete="address-level2" />
                  <Field label="State" name="state" value={form.state} onChange={change} placeholder="State" maxLength={80} autoComplete="address-level1" />
                </div>
                <p className="text-xs leading-5 text-muted">
                  Revenue is optional at this stage. A lending partner may request additional information or documents based on its assessment.
                </p>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button type="button" onClick={() => { setError(""); setStep(1); }} disabled={busy} className="rounded-full border border-forest/15 px-6 py-3.5 text-sm font-semibold text-forest disabled:opacity-50">
                    <ArrowLeft className="mr-2 inline" size={16} /> Back
                  </button>
                  <button type="submit" disabled={busy} className="flex-1 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? <><LoaderCircle className="mr-2 inline animate-spin" size={16} /> Recording enquiry</> : <>Submit enquiry <ArrowRight className="ml-2 inline" size={16} /></>}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
