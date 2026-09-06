import "./globals.css";

export const metadata = {
  title: "Hyper Vision Bangla (HVB)",
  description: "AI video course",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body className="bg-bg-primary text-slate-100">{children}</body>
    </html>
  );
}