"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Operation = "addition" | "subtraction" | "multiplication" | "division";

interface Problem {
  a: number;
  b: number;
  operation: Operation;
  correctAnswer: number;
  choices: number[];
  expression: string;
}

export default function PracticePage() {
  const searchParams = useSearchParams();
  const operation = searchParams.get("operation") as Operation;
  const router = useRouter();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const generateNewProblem = useCallback((op: Operation) => {
    let a = 0,
      b = 0,
      correctAnswer = 0;
    let expression = "";

    if (op === "addition") {
      const x = randomInt(1, 1000);
      const y = randomInt(1, 1000);
      a = x;
      b = y;
      correctAnswer = a + b;
      expression = `${a} + ${b}`;
    } else if (op === "subtraction") {
      const x = randomInt(1, 1000);
      const y = randomInt(1, 1000);
      a = Math.max(x, y);
      b = Math.min(x, y);
      correctAnswer = a - b;
      expression = `${a} - ${b}`;
    } else if (op === "multiplication") {
      const x = randomInt(1, 10);
      const y = randomInt(1, 10);
      a = x;
      b = y;
      correctAnswer = a * b;
      expression = `${a} x ${b}`;
    } else if (op === "division") {
      while (true) {
        const x = randomInt(1, 50);
        const y = randomInt(1, 50);
        if (x % y === 0) {
          a = x;
          b = y;
          correctAnswer = a / b;
          expression = `${a} ÷ ${b}`;
          break;
        }
      }
    }

    const choices = generateChoices(correctAnswer, op);
    setProblem({ a, b, operation: op, correctAnswer, choices, expression });
    setSelectedAnswer(null);
  }, []);

  const generateChoices = (correct: number, op: Operation) => {
    const choicesSet = new Set<number>();
    choicesSet.add(correct);

    while (choicesSet.size < 4) {
      let wrong = 0;
      if (op === "multiplication") {
        wrong = randomInt(1, 100);
      } else if (op === "division") {
        wrong = randomInt(1, 50);
      } else {
        wrong = randomInt(1, 2000);
      }
      if (wrong !== correct) {
        choicesSet.add(wrong);
      }
    }

    const array = Array.from(choicesSet);
    return array.sort(() => Math.random() - 0.5);
  };

  const handleChoice = (answer: number) => {
    if (!problem) return;
    setSelectedAnswer(answer);
    if (answer === problem.correctAnswer) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }
    setTimeout(() => {
      generateNewProblem(operation);
    }, 1000);
  };

  useEffect(() => {
    if (operation) {
      generateNewProblem(operation);
    }
  }, [operation, generateNewProblem]);

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-teal-500 to-cyan-400 dark:from-gray-800 dark:to-gray-900 text-white transition-colors duration-300">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-teal-500 to-cyan-400 dark:from-gray-800 dark:to-gray-900 p-4 transition-colors duration-300">
      <h1 className="text-3xl text-white font-bold mb-8">
        Praticando {translateOperation(problem.operation)}
      </h1>

      <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg max-w-sm w-full flex flex-col items-center transition-colors duration-300">
        <div className="text-2xl font-bold mb-4 dark:text-white">
          {problem.expression}
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          {problem.choices.map((c) => {
            const isSelected = selectedAnswer === c;
            const isCorrect = c === problem.correctAnswer;
            let choiceClass =
              "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-black dark:text-white font-bold p-4 rounded transition-colors";
            if (selectedAnswer !== null) {
              if (isSelected && isCorrect) {
                choiceClass = "bg-green-500 text-white font-bold p-4 rounded";
              } else if (isSelected && !isCorrect) {
                choiceClass = "bg-red-500 text-white font-bold p-4 rounded";
              }
            }
            return (
              <button
                key={c}
                onClick={() => handleChoice(c)}
                disabled={selectedAnswer !== null}
                className={choiceClass}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between w-full mt-6">
          <div className="text-green-800 dark:text-green-400 font-semibold">
            Acertos: {correctCount}
          </div>
          <div className="text-red-800 dark:text-red-400 font-semibold">
            Erros: {incorrectCount}
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push("/")}
        className="mt-8 bg-white dark:bg-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 text-black font-bold py-2 px-4 rounded transition-colors"
      >
        Voltar
      </button>
    </div>
  );
}

// Helper Functions
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function translateOperation(op: Operation) {
  switch (op) {
    case "addition":
      return "Adição";
    case "subtraction":
      return "Subtração";
    case "multiplication":
      return "Multiplicação";
    case "division":
      return "Divisão";
  }
}
