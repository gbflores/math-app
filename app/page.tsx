"use client";

import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();

  const operations = [
    { name: "Adição", value: "addition" },
    { name: "Subtração", value: "subtraction" },
    { name: "Multiplicação", value: "multiplication" },
    { name: "Divisão", value: "division" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-teal-500 to-cyan-400 dark:from-gray-800 dark:to-gray-900 p-4 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="text-4xl text-white font-bold mb-8">
        Praticar Matemática
      </h1>
      <div className="grid grid-cols-2 gap-8">
        {operations.map((op) => (
          <button
            key={op.value}
            onClick={() => router.push(`/practice?operation=${op.value}`)}
            className="bg-white dark:bg-gray-700 dark:text-white rounded-lg shadow p-4 text-2xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            {op.name}
          </button>
        ))}
      </div>
    </div>
  );
}
