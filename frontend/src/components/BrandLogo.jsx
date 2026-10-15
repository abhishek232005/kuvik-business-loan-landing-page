export default function BrandLogo({ className = "", imageClassName = "" }) {
  return (
    <img
      src="/kuvik-logo.png"
      alt="Kuvik Loans — Kuvik Solutions"
      className={`block h-auto object-contain ${className} ${imageClassName}`}
      width="500"
      height="273"
      decoding="async"
    />
  );
}
