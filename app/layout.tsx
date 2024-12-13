import "../styles/globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Math App",
  description:
    "Math App Flash Cards built with Next.js, Tailwind, and TypeScript",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
