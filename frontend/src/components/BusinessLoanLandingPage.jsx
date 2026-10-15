import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  HandCoins,
  Layers3,
  LockKeyhole,
  Menu,
  PackageCheck,
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
    title: "Keep things moving",
    text: "Explore working-capital options for everyday business cash-flow needs.",
    className: "bp-purpose-lilac",
  },
  {
    icon: <Wrench size={22} />,
    number: "02",
    title: "Invest in better tools",
    text: "Ask about financing for eligible equipment, machinery or business assets.",
    className: "bp-purpose-orange",
  },
  {
    icon: <ArrowUpRight size={22} />,
    number: "03",
    title: "Make room to grow",
    text: "Explore funding for a new location, added capacity or expansion plans.",
    className: "bp-purpose-blue",
  },
  {
    icon: <PackageCheck size={22} />,
    number: "04",
    title: "Be ready for demand",
    text: "Consider inventory and eligible operating needs with a lender.",
    className: "bp-purpose-green",
  },
];

const faqs = [
  {
    question: "Who can submit a Business Loan enquiry?",
    answer: "Business owners and applicants associated with a business can share an enquiry. Business type, operating history, applicant profile and financial requirements are assessed by the relevant lending partner.",
  },
  {
    question: "What amount can I apply for, and what rate will I get?",
    answer: "This page does not quote a verified loan range, interest rate, fee or tenure. Any available amount and terms depend on the lending partner's assessment and offer.",
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
    document.title = "Business Loan Enquiries | Kuvik Loans";
    if (description) {
      description.content = "Explore business financing options with Kuvik Loans. Estimate an illustrative EMI and submit a guided Business Loan enquiry.";
    }
    return () => {
      document.title = "Business Loans, built for growth | Kuvik Loans";
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
            <a href="#possibilities">Possibilities</a>
            <a href="#calculator">EMI calculator</a>
            <a href="#eligibility">Eligibility</a>
            <a href="#documents">Documents</a>
            <a href="#faqs">FAQs</a>
            <a href="/about-us">About</a>
          </nav>
          <button className="bp-nav-cta" onClick={openForm}>
            Start an enquiry <ArrowUpRight size={16} />
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
              ["Possibilities", "#possibilities"],
              ["EMI calculator", "#calculator"],
              ["Eligibility", "#eligibility"],
              ["Documents", "#documents"],
              ["FAQs", "#faqs"],
              ["About", "/about-us"],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={closeMenu}>{label}</a>
            ))}
            <button onClick={openForm}>Start an enquiry <ArrowRight size={16} /></button>
          </nav>
        )}
      </header>

      <main>
        <section className="bp-hero" id="home">
          <div className="bp-hero-grain" aria-hidden="true" />
          <div className="bp-hero-inner">
            <div className="bp-hero-copy">
              <div className="bp-hero-kicker"><span /> For the people building what’s next</div>
              <h1>Big ambition.<br /><span>Thoughtful</span> financing.</h1>
              <p>
                Tell us where your business is headed. Explore financing possibilities through a simple enquiry and get guidance on what could come next.
              </p>
              <div className="bp-hero-actions">
                <button onClick={openForm} className="bp-button-primary">
                  Explore options <ArrowUpRight size={17} />
                </button>
                <a href="#possibilities" className="bp-text-link">
                  Find your next step <ArrowDown size={16} />
                </a>
              </div>
              <div className="bp-hero-reassurance">
                <span><ShieldCheck size={16} /> Mobile verified</span>
                <span><CircleHelp size={16} /> No approval promise</span>
              </div>
            </div>

            <div className="bp-hero-art" aria-label="Illustration of a growing small business">
              <div className="bp-art-caption">YOUR NEXT CHAPTER <ArrowUpRight size={15} /></div>
              <div className="bp-art-sun" />
              <div className="bp-art-orbit bp-art-orbit-one" />
              <div className="bp-art-orbit bp-art-orbit-two" />
              <div className="bp-art-chart">
                <span>PLAN / GROW / REPEAT</span>
                <svg viewBox="0 0 400 180" role="img" aria-label="An ascending business growth illustration">
                  <path d="M12 155 C80 145 96 115 144 125 S210 135 248 90 S307 76 337 47 S372 38 392 12" />
                  <path className="bp-chart-dash" d="M12 155 C80 145 96 115 144 125 S210 135 248 90 S307 76 337 47 S372 38 392 12" />
                  <circle cx="248" cy="90" r="5" />
                  <circle cx="337" cy="47" r="5" />
                  <circle cx="392" cy="12" r="7" />
                </svg>
              </div>
              <div className="bp-art-shop">
                <div className="bp-shop-awning">
                  <i /><i /><i /><i /><i /><i />
                </div>
                <div className="bp-shop-roof" />
                <div className="bp-shop-window"><span /><span /></div>
                <div className="bp-shop-door"><span /></div>
                <div className="bp-shop-sign">YOUR BUSINESS</div>
              </div>
              <div className="bp-art-note">
                <span className="bp-art-note-icon"><BriefcaseBusiness size={16} /></span>
                <span><b>Built around your plans</b><small>Your business. Your next move.</small></span>
              </div>
              <div className="bp-art-stamp"><span>MAKE<br />ROOM<br />TO GROW</span><ArrowUpRight size={18} /></div>
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
              label="Room for possibility"
              title={<>What are you<br />working towards?</>}
              text="Every business has its own next move. Share what you have in mind so a lending partner can assess whether it fits its criteria."
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

        <section className="bp-product-note">
          <div className="bp-product-note-inner">
            <span className="bp-product-icon"><BadgeIndianRupee size={23} /></span>
            <div>
              <span className="bp-eyebrow">A note on loan terms</span>
              <h2>Real terms. Shared by the lender.</h2>
              <p>
                This page does not quote a verified loan range, rate, tenure or fee. The lending partner will share applicable terms if it makes an offer. Review them before you decide.
              </p>
            </div>
            <span className="bp-note-orbit" aria-hidden="true" />
          </div>
        </section>

        <section className="bp-section bp-process" id="process">
          <div className="bp-process-intro">
            <SectionIntro
              label="The enquiry, in motion"
              title={<>A few clear steps.<br /><span>Then your call.</span></>}
              text="An online enquiry starts the conversation. The lender decides what information and checks are needed next."
            />
            <button onClick={openForm} className="bp-button-dark">Start an enquiry <ArrowRight size={17} /></button>
          </div>
          <div className="bp-process-list">
            {[
              ["01", "Tell us the basics", "Share your contact details and business financing purpose."],
              ["02", "Verify your number", "Confirm access to your mobile with a one-time code."],
              ["03", "Add business details", "Provide your business type, operating history and location."],
              ["04", "Lender review", "A lending partner may request documents and assess eligibility."],
              ["05", "Review what’s next", "Consider the lender’s communication and any terms before proceeding."],
            ].map(([number, title, text], index) => (
              <article className="bp-process-row" key={number}>
                <span className="bp-process-number">{number}</span>
                <span className={`bp-process-dot bp-process-dot-${index + 1}`} />
                <div><h3>{title}</h3><p>{text}</p></div>
                <ArrowUpRight size={17} className="bp-process-arrow" />
              </article>
            ))}
          </div>
        </section>

        <section className="bp-calculator" id="calculator">
          <div className="bp-calculator-inner">
            <div className="bp-calculator-copy">
              <span className="bp-eyebrow">Make the numbers tangible</span>
              <h2>Try a repayment<br />scenario.</h2>
              <p>Move the controls and see how an example EMI changes. These are assumptions for illustration—not product terms or a lender quote.</p>
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
                  <input aria-label="Illustrative loan amount" type="range" min="50000" max="5000000" step="25000" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
                  <span className="bp-range-labels"><small>₹50,000</small><small>₹50 lakh</small></span>
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
          <div className="bp-documents-inner">
            <div className="bp-documents-copy">
              <span className="bp-eyebrow">Paperwork, when it’s time</span>
              <h2>Know what might<br />be useful.</h2>
              <p>We don’t collect business documents in the initial enquiry. A lender will tell you what it needs and how to submit it.</p>
              <div className="bp-documents-callout"><FileCheck2 size={18} /><span>Exact requirements depend on your profile and the lending partner.</span></div>
            </div>
            <div className="bp-document-stack">
              {[
                ["A", "Identity & address", "PAN and identity/address proof, where requested."],
                ["B", "Proof of business", "Registration or other business proof, as applicable."],
                ["C", "Bank statements", "Business statements for the period the lender requests."],
                ["D", "Financial records", "Financial statements, turnover proof or GST details, if applicable."],
              ].map(([letter, title, text]) => (
                <article className="bp-document-row" key={letter}>
                  <span>{letter}</span><div><h3>{title}</h3><p>{text}</p></div><Check size={16} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bp-faq-section" id="faqs">
          <div className="bp-faq-inner">
            <div className="bp-faq-heading">
              <span className="bp-eyebrow">The useful details</span>
              <h2>Good questions.<br /><span>Clear answers.</span></h2>
              <p>Because a thoughtful decision starts with understanding the details.</p>
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
          <div className="bp-final-orbit bp-final-orbit-one" aria-hidden="true" />
          <div className="bp-final-orbit bp-final-orbit-two" aria-hidden="true" />
          <div className="bp-final-inner">
            <span className="bp-eyebrow">For your next chapter</span>
            <h2>Let’s explore<br /><span>what’s possible.</span></h2>
            <p>Share what your business is working towards. A lending partner assesses your enquiry; approval is not guaranteed.</p>
            <button onClick={openForm} className="bp-button-primary">Start an enquiry <ArrowUpRight size={17} /></button>
          </div>
          <div className="bp-final-illustration" aria-hidden="true">
            <div className="bp-final-sun" />
            <div className="bp-final-building"><span /><span /><span /><i /></div>
            <div className="bp-final-leaf bp-final-leaf-a" />
            <div className="bp-final-leaf bp-final-leaf-b" />
          </div>
        </section>
      </main>

      <footer className="bp-footer">
        <div className="bp-footer-main">
          <div className="bp-footer-brand">
            <a href="#top" aria-label="Kuvik Loans home"><BrandLogo className="w-36" /></a>
            <p>Guidance for your business financing enquiry. Lending partners determine eligibility and loan terms.</p>
          </div>
          <div className="bp-footer-contact">
            <span className="bp-eyebrow">Talk to our team</span>
            <h2>Kuvik Solutions Pvt. Ltd.</h2>
            <address>Office No. 103, First Floor, 12 Ram Bharat Villa, Siddharth Colony, Ajmer Road, Jaipur – 302006, Rajasthan</address>
            <a href="tel:+919509439300">+91 95094-39300</a>
            <a href="mailto:support@kuvikloans.com">support@kuvikloans.com</a>
            <span>CIN: U66190RJ2026PTC111957</span>
          </div>
          <nav className="bp-footer-links" aria-label="Footer navigation">
            <span className="bp-eyebrow">Explore</span>
            <a href="#possibilities">Financing possibilities</a>
            <a href="#calculator">EMI calculator</a>
            <a href="#eligibility">Eligibility</a>
            <a href="#documents">Documents</a>
            <a href="/about-us">About Kuvik</a>
            <a href="/privacy">Privacy notice</a>
          </nav>
        </div>
        <div className="bp-footer-bottom">
          <p>Kuvik Solutions Pvt. Ltd. operates the Kuvik Loans website. Loan availability, approval, rate, fees and disbursal depend on the lending partner’s assessment and terms. The calculator is an estimate, not a loan offer.</p>
          <span>© {new Date().getFullYear()} Kuvik Loans. All rights reserved.</span>
        </div>
      </footer>

      {formOpen && <BusinessLoanLeadForm onClose={() => setFormOpen(false)} requestedAmount={amount} />}
    </div>
  );
}
