import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Banknote,
  Check,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  HandCoins,
  Layers3,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  PackageCheck,
  Phone,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import BrandLogo from "./BrandLogo.jsx";
import BusinessLoanLeadForm from "./BusinessLoanLeadForm.jsx";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function calculateEmi(principal, annualRate, months) {
  const monthlyRate = annualRate / 1200;
  if (!monthlyRate) return principal / months;
  const multiplier = (1 + monthlyRate) ** months;
  return (principal * monthlyRate * multiplier) / (multiplier - 1);
}

function SectionIntro({ label, title, text, light = false }) {
  return (
    <div className={`bp-intro${light ? " bp-intro-light" : ""}`}>
      <span className="bp-eyebrow">{label}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

const purposeCards = [
  {
    icon: <Banknote size={22} />,
    number: "01",
    title: "Keep cash flow moving",
    text: "Explore working-capital options for supplier payments, operating costs and the gaps between invoices.",
    className: "bp-purpose-lilac",
  },
  {
    icon: <Wrench size={22} />,
    number: "02",
    title: "Equip your next shift",
    text: "Ask a lender about financing eligible machinery, tools or business equipment that can lift capacity.",
    className: "bp-purpose-orange",
  },
  {
    icon: <ArrowUpRight size={22} />,
    number: "03",
    title: "Open up new capacity",
    text: "Explore funding for a new location, a larger team or the next stage of your expansion plan.",
    className: "bp-purpose-blue",
  },
  {
    icon: <PackageCheck size={22} />,
    number: "04",
    title: "Stock up for demand",
    text: "Plan ahead for seasonal orders, faster-moving products or a larger inventory cycle.",
    className: "bp-purpose-green",
  },
];

const faqs = [
  {
    question: "Who can submit a Business Loan enquiry?",
    answer: "Business owners and applicants associated with a business can share an enquiry. Business type, operating history, applicant profile and financial requirements are assessed by the relevant lending partner.",
  },
  {
    question: "How much business funding can I enquire about?",
    answer: "You can enquire about business funding up to ₹3 crore. The amount, rate, fees, tenure and any security requirements depend on the lender’s assessment and approval.",
  },
  {
    question: "What interest rate and repayment period should I expect?",
    answer: "There is no one-size-fits-all rate or repayment period. The lending partner will assess your business and share its applicable rate, fees, tenure and repayment schedule in any offer.",
  },
  {
    question: "Which documents might a lender ask for?",
    answer: "Depending on your profile, a lender may request PAN and identity/address proof, business registration or proof of business, bank statements, financial or turnover records, and GST details where applicable.",
  },
  {
    question: "Is the EMI calculator a loan quote?",
    answer: "No. The calculator is an illustration using the amount, annual rate and term you select. It uses a standard reducing-balance calculation and excludes fees and taxes. The values are not Kuvik Loans product limits or rates.",
  },
  {
    question: "Does an enquiry mean my loan is approved?",
    answer: "No. An enquiry is only a starting point. The relevant lending partner carries out its own checks and decides whether to make an offer. Approval and disbursal are not guaranteed.",
  },
  {
    question: "How soon will I receive a decision?",
    answer: "Timing varies by lender, applicant information and any additional documents or checks. Kuvik Loans does not promise an instant decision or a fixed disbursal timeline.",
  },
  {
    question: "How do I check my enquiry status?",
    answer: "Contact Kuvik Loans using the details in the footer and identify the mobile number used for your enquiry. Never share your OTP with anyone.",
  },
  {
    question: "How is the information I provide handled?",
    answer: "A one-time code verifies your mobile number. Business Loan enquiries are stored in their own application records. See the privacy notice for details about information use and CRM synchronization.",
  },
];

export default function BusinessLoanLandingPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(14);
  const [months, setMonths] = useState(36);
  const emi = calculateEmi(amount, rate, months);

  useEffect(() => {
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = "Business Loan up to ₹3 Crore | Kuvik Loans";
    if (description) {
      description.content = "Explore business funding up to ₹3 crore with Kuvik Loans for working capital, equipment and expansion. Check an illustrative EMI and submit an enquiry, subject to lender approval.";
    }
    return () => {
      document.title = "Business Loan up to ₹3 Crore | Kuvik Loans";
      if (description && previousDescription) description.content = previousDescription;
    };
  }, []);

  const openForm = () => {
    setMenuOpen(false);
    setFormOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="business-page" id="top">
      <header className="bp-header">
        <div className="bp-nav">
          <a href="#top" className="bp-brand" aria-label="Kuvik Loans home">
            <BrandLogo className="w-28 sm:w-32" />
          </a>
          <nav aria-label="Main navigation" className="bp-desktop-nav">
            <a href="#possibilities">Loan services</a>
            <a href="#calculator">EMI calculator</a>
            <a href="#eligibility">Eligibility</a>
            <a href="#documents">Documents</a>
            <a href="#faqs">FAQs</a>
            <a href="/about-us">About</a>
          </nav>
          <button className="bp-nav-cta" onClick={openForm}>
            Apply Now <ArrowUpRight size={16} />
          </button>
          <button
            className="bp-menu-toggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="bp-mobile-nav" aria-label="Mobile navigation">
            {[
              ["Loan services", "#possibilities"],
              ["EMI calculator", "#calculator"],
              ["Eligibility", "#eligibility"],
              ["Documents", "#documents"],
              ["FAQs", "#faqs"],
              ["About", "/about-us"],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={closeMenu}>{label}</a>
            ))}
            <button onClick={openForm}>Apply Now <ArrowRight size={16} /></button>
          </nav>
        )}
      </header>

      <main>
        <section className="bp-hero" id="home">
          <div className="bp-hero-grain" aria-hidden="true" />
          <div className="bp-hero-inner">
            <div className="bp-hero-copy">
              <div className="bp-hero-kicker"><span /> Business loans up to ₹3 crore</div>
              <h1>Grow Your Business with the<br /> <span>Right Business Loan.</span></h1>
              <p>
                Explore funding up to ₹3 crore for working capital, new machinery, bigger orders or expansion. Tell us the plan; a lending partner will assess what may fit.
              </p>
              <div className="bp-hero-actions">
                <button onClick={openForm} className="bp-button-primary">
                  Check your options <ArrowUpRight size={17} />
                </button>
                <a href="#possibilities" className="bp-text-link">
                  See what you can fund <ArrowDown size={16} />
                </a>
              </div>
              <p className="bp-hero-disclaimer">Up to ₹3 crore, subject to your profile, lender eligibility and approval.</p>
              <div className="bp-hero-reassurance">
                <span><ShieldCheck size={16} /> Mobile-verified enquiry</span>
                <span><CircleHelp size={16} /> Lender-led assessment</span>
              </div>
            </div>

            <div className="bp-hero-art bp-offer-art" aria-label="Business funding up to three crore rupees, subject to lender eligibility and approval">
              <div className="bp-offer-grid" aria-hidden="true" />
              <div className="bp-offer-card">
                <div className="bp-offer-card-head">
                  <span><i /> BUSINESS FUNDING</span>
                  <span className="bp-offer-icon"><Banknote size={20} /></span>
                </div>
                <div className="bp-offer-amount">
                  <span>Funding options up to</span>
                  <strong>₹3<span> Cr</span></strong>
                  <small>Terms and approval depend on lender assessment</small>
                </div>
                <div className="bp-offer-visual" aria-hidden="true">
                  <div className="bp-offer-visual-label"><span>BUSINESS MOMENTUM</span><ArrowUpRight size={15} /></div>
                  <svg viewBox="0 0 480 112" preserveAspectRatio="none">
                    <defs><linearGradient id="offer-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".22" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
                    <path className="bp-offer-area" d="M0 91 C48 78 73 84 111 64 S174 74 219 43 S293 57 326 37 S396 44 432 18 S462 16 480 3 V112 H0 Z" />
                    <path className="bp-offer-line" d="M0 91 C48 78 73 84 111 64 S174 74 219 43 S293 57 326 37 S396 44 432 18 S462 16 480 3" />
                    <circle cx="432" cy="18" r="5" />
                  </svg>
                </div>
              <div className="bp-offer-tags"><span>Working capital</span><span>Project finance</span><span>Expansion</span></div>
                <div className="bp-offer-card-foot"><span><ShieldCheck size={15} /> Lender-led assessment</span><span>01 / 03</span></div>
              </div>
              <div className="bp-offer-float"><span><BadgeIndianRupee size={16} /></span><div><b>Made for business</b><small>Funding options that fit your plans</small></div></div>
            </div>
          </div>
          <a className="bp-scroll-cue" href="#possibilities"><span /> Scroll to explore</a>
        </section>

        <section className="bp-marquee" aria-label="Business funding enquiry">
          <div className="bp-marquee-track">
            {Array.from({ length: 2 }, (_, row) => (
              <span key={row} aria-hidden={row === 1}>
                BUSINESS HAS MOMENTUM <i /> MAKE SPACE FOR WHAT’S NEXT <i /> YOUR PLANS, YOUR PACE <i /> BUSINESS HAS MOMENTUM <i /> MAKE SPACE FOR WHAT’S NEXT <i /> YOUR PLANS, YOUR PACE <i />
              </span>
            ))}
          </div>
        </section>

        <section id="possibilities" className="bp-section bp-possibilities">
          <div className="bp-section-head">
            <SectionIntro
              label="Business loan services"
              title={<>Put capital behind<br />your next move.</>}
              text="Choose the business goal you’re working toward. Explore a financing route for the next stage of your growth."
            />
            <div className="bp-side-note">
              <span className="bp-side-note-mark"><Layers3 size={19} /></span>
              <p>Possible uses are examples only. Final eligibility depends on the lender and its product terms.</p>
            </div>
          </div>
          <div className="bp-purpose-grid">
            {purposeCards.map((card) => (
              <article className={`bp-purpose-card ${card.className}`} key={card.number}>
                <div className="bp-purpose-top"><span>{card.number}</span><i>{card.icon}</i></div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
                <span className="bp-purpose-arrow"><ArrowUpRight size={18} /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="bp-loan-types" id="loan-types" aria-labelledby="loan-types-title">
          <div className="bp-loan-types-head">
            <span className="bp-eyebrow">Two ways to fund your next move</span>
            <h2 id="loan-types-title">Find a route that fits your business.</h2>
            <p>Explore unsecured and secured business funding. The lender will confirm which options are available for your profile.</p>
          </div>
          <div className="bp-loan-type-list">
            <article className="bp-loan-type bp-loan-type-unsecured">
              <div className="bp-loan-type-visual">
                <img src="/unsecured-business-loan.png" alt="Business owner planning in an office" />
                <div className="bp-loan-visual-stat"><span><Banknote size={17} /></span><b>Built for momentum</b><small>Capital for the next step</small></div>
              </div>
              <div className="bp-loan-type-copy">
                <span className="bp-loan-type-label"><LockKeyhole size={15} /> No collateral pledge</span>
                <h3>Unsecured Business Loan</h3>
                <p>Explore funding for working capital, inventory, equipment or expansion without pledging property as security.</p>
                <ul><li>Up to ₹50 lakh, subject to lender assessment</li><li>Suitable for eligible day-to-day and growth needs</li></ul>
                <button onClick={openForm} className="bp-button-primary">Enquire about unsecured funding <ArrowUpRight size={16} /></button>
                <small className="bp-loan-type-disclaimer">Availability, terms and approval depend on lender assessment.</small>
              </div>
            </article>
            <article className="bp-loan-type bp-loan-type-secured">
              <div className="bp-loan-type-visual">
                <img src="/secured-business-loan.png" alt="Business owners reviewing plans at a manufacturing facility" />
                <div className="bp-loan-visual-stat"><span><BadgeIndianRupee size={17} /></span><b>More room to grow</b><small>Funding options up to ₹3 crore</small></div>
              </div>
              <div className="bp-loan-type-copy">
                <span className="bp-loan-type-label"><ShieldCheck size={15} /> Secured by eligible property</span>
                <h3>Secured Business Loan</h3>
                <p>Use eligible property as security to explore larger funding for expansion, working capital or significant business investments.</p>
                <ul><li>Enquire about funding up to ₹3 crore</li><li>Flexible terms and security depend on lender and property checks</li></ul>
                <button onClick={openForm} className="bp-button-primary">Enquire about secured funding <ArrowUpRight size={16} /></button>
                <small className="bp-loan-type-disclaimer">₹3 crore is an enquiry limit, not a guaranteed offer or approval.</small>
              </div>
            </article>
          </div>
        </section>

        <section className="bp-product-note">
          <div className="bp-product-note-inner">
            <span className="bp-product-icon"><BadgeIndianRupee size={23} /></span>
            <div>
              <span className="bp-eyebrow">Business funding, up to ₹3 crore</span>
              <h2>Make your next move with a clearer plan.</h2>
              <p>
                Enquire about business funding up to ₹3 crore for eligible working-capital, equipment, project or expansion needs. The lending partner will assess your application and confirm any offer, rate, fees, tenure and security requirements.
              </p>
            </div>
            <span className="bp-note-orbit" aria-hidden="true" />
          </div>
        </section>

        <section className="bp-journey" id="process">
          <div className="bp-journey-inner">
            <div className="bp-journey-heading">
              <span className="bp-eyebrow">A clearer way forward</span>
              <h2>From your business plan to a lender’s decision.</h2>
              <p>Start with a short enquiry. Your lending partner will guide you through the information and checks needed for an offer.</p>
              <button onClick={openForm} className="bp-button-primary">Start an enquiry <ArrowRight size={17} /></button>
            </div>
            <div className="bp-journey-steps">
              {[
                ["01", <ShieldCheck size={21} />, "KYC & business details", "Verify your mobile and share basic details about you and your business. The lender may request additional KYC documents during its review."],
                ["02", <FileCheck2 size={21} />, "Bank statement review", "If needed, the lender will ask for recent business bank statements to understand cash flow. They are not part of this first enquiry."],
                ["03", <BadgeIndianRupee size={21} />, "Loan eligibility", "The lender reviews your profile, business performance and funding need before deciding eligibility and any offer."],
              ].map(([number, icon, title, text]) => (
                <article className="bp-journey-step" key={number}>
                  <div className="bp-journey-marker"><span>{number}</span><i>{icon}</i></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bp-calculator" id="calculator">
          <div className="bp-calculator-inner">
            <div className="bp-calculator-copy">
              <span className="bp-eyebrow">Plan your repayments</span>
              <h2>Plan the numbers<br />before you move.</h2>
              <p>Set an amount, an example rate and a repayment period to shape a monthly estimate. Use it to plan a conversation—not as a lender quote.</p>
              <div className="bp-calculator-assurance"><LockKeyhole size={16} /> No application needed to use the calculator.</div>
            </div>
            <div className="bp-calc-card">
              <div className="bp-calc-card-head">
                <span><HandCoins size={17} /> YOUR ILLUSTRATION</span>
                <span className="bp-calc-badge">ESTIMATE</span>
              </div>
              <div className="bp-calc-result">
                <span>Estimated monthly EMI</span>
                <strong aria-live="polite">{money.format(emi)}</strong>
                <small>at an illustrative {rate}% annual rate</small>
              </div>
              <div className="bp-calc-controls">
                <label>
                  <span>Loan amount <b>{money.format(amount)}</b></span>
                  <input aria-label="Illustrative loan amount" type="range" min="50000" max="30000000" step="50000" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
                  <span className="bp-range-labels"><small>₹50,000</small><small>₹3 crore</small></span>
                </label>
                <label>
                  <span>Annual rate <b>{rate}%</b></span>
                  <input aria-label="Illustrative annual interest rate" type="range" min="6" max="36" step="0.5" value={rate} onChange={(event) => setRate(Number(event.target.value))} />
                  <span className="bp-range-labels"><small>6%</small><small>36%</small></span>
                </label>
                <label>
                  <span>Repayment period <b>{months} months</b></span>
                  <input aria-label="Illustrative repayment period" type="range" min="6" max="84" step="1" value={months} onChange={(event) => setMonths(Number(event.target.value))} />
                  <span className="bp-range-labels"><small>6 months</small><small>84 months</small></span>
                </label>
              </div>
              <div className="bp-calc-totals">
                <div><span>Illustrative total repayment</span><b>{money.format(emi * months)}</b></div>
                <div><span>Illustrative interest</span><b>{money.format(emi * months - amount)}</b></div>
              </div>
              <p className="bp-calc-disclaimer">Reducing-balance estimate; excludes fees and taxes. Your actual rate, EMI and terms depend on the lender and its approved offer.</p>
            </div>
          </div>
          <div className="bp-calc-decoration" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
        </section>

        <section className="bp-section bp-profile" id="eligibility">
          <div className="bp-profile-head">
            <SectionIntro
              label="A lender looks at the whole picture"
              title={<>Your business is<br />more than a number.</>}
              text="Eligibility requirements vary. A lending partner may consider factors such as:"
            />
            <div className="bp-profile-seal"><span>CHECKED<br />BY YOUR<br />LENDER</span><ShieldCheck size={20} /></div>
          </div>
          <div className="bp-profile-grid">
            {[
              ["01", "The business", "Business type, activity and time in operation."],
              ["02", "The financials", "Turnover, cash flow and ability to repay."],
              ["03", "The applicant", "Identity, credit profile and lender-specific checks."],
              ["04", "The purpose", "Whether the requested use fits the loan product."],
            ].map(([number, title, text]) => (
              <article className="bp-profile-item" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
          <p className="bp-fine-print">No age, vintage, turnover or credit-score threshold is stated here because eligibility depends on the lending partner.</p>
        </section>

        <section className="bp-documents" id="documents">
          <div className="bp-documents-panel">
            <div className="bp-documents-inner">
              <div className="bp-documents-copy">
                <span className="bp-eyebrow">A little preparation goes a long way</span>
                <h2>Documents your lender<br />may ask for.</h2>
                <p>Keep these common business records within reach. Your lender will confirm what applies to your profile and loan request.</p>
                <div className="bp-documents-callout"><ShieldCheck size={18} /><span>Documents are shared when requested during the lender’s review. They are not needed for this initial enquiry.</span></div>
                <div className="bp-document-stack">
                  {[
                    ["01", "PAN & identity proof", "PAN, Aadhaar or other KYC details, as requested."],
                    ["02", "Business registration", "GST, Udyam or other business proof, where applicable."],
                    ["03", "Bank & financial statements", "Recent bank statements, turnover records or ITR, if requested."],
                  ].map(([number, title, text]) => (
                    <article className="bp-document-row" key={number}>
                      <span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><Check size={16} />
                    </article>
                  ))}
                </div>
              </div>
              <div className="bp-documents-art" aria-hidden="true">
                <div className="bp-documents-art-orbit" />
                <div className="bp-documents-paper bp-documents-paper-back" />
                <div className="bp-documents-paper bp-documents-paper-front">
                  <span className="bp-documents-paper-icon"><FileCheck2 size={24} /></span>
                  <span className="bp-documents-paper-kicker">BUSINESS LOAN</span>
                  <strong>Document<br />checklist</strong>
                  <i /><i /><i />
                </div>
                <div className="bp-documents-art-stamp"><Check size={17} /><span>READY<br />WHEN ASKED</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bp-faq-section" id="faqs">
          <div className="bp-faq-inner">
            <div className="bp-faq-heading">
              <span className="bp-eyebrow">The useful details</span>
              <h2>Big decisions.<br /><span>Clear answers.</span></h2>
              <p>Understand the process and the lender’s terms before deciding what works for your business.</p>
              <a href="/privacy">Read the privacy notice <ArrowUpRight size={15} /></a>
            </div>
            <div className="bp-faq-list">
              {faqs.map((faq) => (
                <details key={faq.question} className="bp-faq">
                  <summary>{faq.question}<ChevronDown size={18} /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bp-final-cta" id="apply">
          <div className="bp-final-inner">
            <span className="bp-eyebrow">Let’s talk about your next move</span>
            <h2>Take your business<br /><span>to its next stage.</span></h2>
            <p>Explore funding up to ₹3 crore for working capital, equipment, project finance or expansion. Share a few details; a lending partner will assess eligibility and terms.</p>
            <button onClick={openForm} className="bp-button-primary">Check funding options <ArrowUpRight size={17} /></button>
          </div>
          <div className="bp-final-visual" aria-label="Business funding enquiry up to three crore rupees, subject to lender assessment">
            <div className="bp-final-visual-orbit" aria-hidden="true" />
            <div className="bp-final-funding-card">
              <div className="bp-final-card-top"><span><i /> BUSINESS FUNDING</span><ArrowUpRight size={18} /></div>
              <span className="bp-final-card-label">Explore options up to</span>
              <strong>₹3 <small>crore</small></strong>
              <span className="bp-final-card-note">Subject to lender eligibility and approval</span>
              <div className="bp-final-card-tags"><span>Working capital</span><span>Expansion</span></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bp-footer">
        <div className="bp-footer-main">
          <div className="bp-footer-brand">
            <a href="#top" aria-label="Kuvik Loans home"><BrandLogo className="w-36" /></a>
            <p>Kuvik Solutions — Your trusted financial partner for all types of loans and credit solutions.</p>
            <div className="bp-footer-offer"><span>BUSINESS FUNDING</span><strong>Up to ₹3 crore</strong><small>Subject to lender eligibility and approval</small></div>
          </div>
          <div className="bp-footer-contact">
            <span className="bp-eyebrow">Here to help</span>
            <h2>Kuvik Solutions Pvt. Ltd.</h2>
            <div className="bp-footer-contact-cards">
              <a className="bp-footer-contact-card" href="tel:+919509439300"><i><Phone size={16} /></i><span>Ph No.<strong>+91 95094-39300</strong></span><ArrowUpRight size={15} /></a>
              <a className="bp-footer-contact-card" href="mailto:support@kuvikloans.com"><i><Mail size={16} /></i><span>Email ID<strong>support@kuvikloans.com</strong></span><ArrowUpRight size={15} /></a>
            </div>
            <address className="bp-footer-address"><MapPin size={17} /><span>Office No. 103, First Floor, 12 Ram Bharat Villa, Siddharth Colony, Ajmer Road, Jaipur – 302006, Rajasthan</span></address>
            <span className="bp-footer-cin">CIN: U66190RJ2026PTC111957</span>
          </div>
          <nav className="bp-footer-links" aria-label="Footer navigation">
            <span className="bp-eyebrow">Explore Kuvik</span>
            <a href="#possibilities">Financing possibilities</a>
            <a href="#calculator">EMI calculator</a>
            <a href="#eligibility">Eligibility</a>
            <a href="#documents">Documents</a>
            <a href="/about-us">About Kuvik</a>
            <a href="/privacy">Privacy notice</a>
          </nav>
        </div>
        <div className="bp-footer-trust">
          <span>Security and quality certifications</span>
          <img src="/certifications-iso.png" alt="ISO 27001 Information Security Management and ICV certified" />
        </div>
        <div className="bp-footer-bottom">
          <p>Kuvik Solutions Pvt. Ltd. operates the Kuvik Loans website. Loan availability, approval, rate, fees and disbursal depend on the lending partner’s assessment and terms. The calculator is an estimate, not a loan offer.</p>
          <span>© {new Date().getFullYear()} Kuvik Loans. All rights reserved.</span>
          <nav className="bp-footer-socials" aria-label="Kuvik Loans social media">
            <a href="https://www.facebook.com/people/Kuvik-Loans/61577396840584/" target="_blank" rel="noreferrer" aria-label="Kuvik Loans on Facebook"><span aria-hidden="true">f</span></a>
            <a href="https://www.instagram.com/kuvikloans" target="_blank" rel="noreferrer" aria-label="Kuvik Loans on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r=".8" className="bp-social-dot" /></svg></a>
            <a href="https://www.linkedin.com/company/kuvik-loans/posts/" target="_blank" rel="noreferrer" aria-label="Kuvik Loans on LinkedIn"><span aria-hidden="true">in</span></a>
          </nav>
        </div>
      </footer>

      {formOpen && <BusinessLoanLeadForm onClose={() => setFormOpen(false)} requestedAmount={amount} />}
    </div>
  );
}
