// app/layout.tsx
import "../appStyles/globals.css";

export const metadata = { title: "PSL2 Cockpit" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
