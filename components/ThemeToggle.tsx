"use client"; // Ensure client-side interactions for the toggle

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="px-4 py-2 bg-white dark:bg-gray-700 text-black dark:text-white rounded-full border border-gray-300 dark:border-gray-600 shadow"
    >
      {darkMode ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
