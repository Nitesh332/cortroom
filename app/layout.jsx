import "./globals.css";

export const metadata = {
  title: "PublicVerdict | Social Media Courtroom",
  description: "Crowdsource evidence, debate cases, and let the public decide the verdict.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="min-h-full bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
