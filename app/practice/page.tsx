"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

type Operation = "addition" | "subtraction" | "multiplication" | "division";

type RangeConfig = {
  key: string;
  label: string;
  min: number;
  max: number;
};

type MultiplicationConfig = {
  key: string;
  label: string;
  fixed?: number;
  min: number;
  max: number;
};

type DivisionConfig = {
  key: string;
  label: string;
  max: number;
};

type ConfigOption = RangeConfig | MultiplicationConfig | DivisionConfig;

interface Problem {
  a: number;
  b: number;
  operation: Operation;
  correctAnswer: number;
  choices: number[];
  expression: string;
}

type StoredProgress = {
  correctCount: number;
  incorrectCount: number;
};

type PlayerProgress = {
  points: number;
  level: number;
  currentLevelThreshold: number;
  nextLevelThreshold: number;
  progressInLevel: number;
  pointsNeeded: number;
  progressPercent: number;
};

const additionConfigs: RangeConfig[] = [
  { key: "1-500", label: "1 a 500", min: 1, max: 500 },
  { key: "1-1000", label: "1 a 1000", min: 1, max: 1000 },
  { key: "1-10000", label: "1 a 10000", min: 1, max: 10000 },
  { key: "500-1000", label: "500 a 1000", min: 500, max: 1000 },
  { key: "1000-10000", label: "1000 a 10000", min: 1000, max: 10000 },
];

const subtractionConfigs: RangeConfig[] = [
  { key: "1-1000", label: "1 a 1000", min: 1, max: 1000 },
  { key: "1-10000", label: "1 a 10000", min: 1, max: 10000 },
  { key: "500-1000", label: "500 a 1000", min: 500, max: 1000 },
  { key: "1000-10000", label: "1000 a 10000", min: 1000, max: 10000 },
];

const multiplicationConfigs: MultiplicationConfig[] = [
  { key: "table-1", label: "Tabuada do 1", fixed: 1, min: 1, max: 10 },
  { key: "table-2", label: "Tabuada do 2", fixed: 2, min: 1, max: 10 },
  { key: "table-3", label: "Tabuada do 3", fixed: 3, min: 1, max: 10 },
  { key: "table-4", label: "Tabuada do 4", fixed: 4, min: 1, max: 10 },
  { key: "table-5", label: "Tabuada do 5", fixed: 5, min: 1, max: 10 },
  { key: "table-6", label: "Tabuada do 6", fixed: 6, min: 1, max: 10 },
  { key: "table-7", label: "Tabuada do 7", fixed: 7, min: 1, max: 10 },
  { key: "table-8", label: "Tabuada do 8", fixed: 8, min: 1, max: 10 },
  { key: "table-9", label: "Tabuada do 9", fixed: 9, min: 1, max: 10 },
  { key: "table-10", label: "Tabuada do 10", fixed: 10, min: 1, max: 10 },
  { key: "1-10", label: "De 1 a 10", min: 1, max: 10 },
  { key: "1-20", label: "De 1 a 20", min: 1, max: 20 },
];

const divisionConfigs: DivisionConfig[] = [
  { key: "max-50", label: "Máximo 50", max: 50 },
  { key: "max-100", label: "Máximo 100", max: 100 },
  { key: "max-1000", label: "Máximo 1000", max: 1000 },
];

const operationConfigs: Record<Operation, ConfigOption[]> = {
  addition: additionConfigs,
  subtraction: subtractionConfigs,
  multiplication: multiplicationConfigs,
  division: divisionConfigs,
};

const PROGRESS_STORAGE_KEY = "math-app-progress-v3";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function PracticePageContent() {
  const searchParams = useSearchParams();
  const operation = searchParams.get("operation") as Operation;
  const router = useRouter();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selectedConfigKey, setSelectedConfigKey] = useState("");
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);

  const playerProgress = calculatePlayerProgress(correctCount, incorrectCount);

  const generateNewProblem = useCallback((op: Operation, configKey: string) => {
    const config = getConfigForOperation(op, configKey);
    let a = 0,
      b = 0,
      correctAnswer = 0;
    let expression = "";

    if (op === "addition" && isRangeConfig(config)) {
      const x = randomInt(config.min, config.max);
      const y = randomInt(config.min, config.max);
      a = x;
      b = y;
      correctAnswer = a + b;
      expression = `${a} + ${b}`;
    } else if (op === "subtraction" && isRangeConfig(config)) {
      const x = randomInt(config.min, config.max);
      const y = randomInt(config.min, config.max);
      a = Math.max(x, y);
      b = Math.min(x, y);
      correctAnswer = a - b;
      expression = `${a} - ${b}`;
    } else if (op === "multiplication" && isMultiplicationConfig(config)) {
      const x = config.fixed ?? randomInt(config.min, config.max);
      const y = randomInt(config.min, config.max);
      a = x;
      b = y;
      correctAnswer = a * b;
      expression = `${a} x ${b}`;
    } else if (op === "division" && isDivisionConfig(config)) {
      const divisor = randomInt(1, config.max);
      const quotient = randomInt(1, Math.max(1, Math.floor(config.max / divisor)));
      a = divisor * quotient;
      b = divisor;
      correctAnswer = quotient;
      expression = `${a} ÷ ${b}`;
    }

    const choices = generateChoices(correctAnswer, op, config);
    setProblem({ a, b, operation: op, correctAnswer, choices, expression });
    setSelectedAnswer(null);
  }, []);

  const generateChoices = (
    correct: number,
    op: Operation,
    config: ConfigOption,
  ) => {
    const choicesSet = new Set<number>();
    choicesSet.add(correct);
    const maxWrongAnswer = getMaxWrongAnswer(op, config, correct);

    while (choicesSet.size < 4) {
      const wrong = randomInt(1, maxWrongAnswer);
      if (wrong !== correct) {
        choicesSet.add(wrong);
      }
    }

    const array = Array.from(choicesSet);
    return array.sort(() => Math.random() - 0.5);
  };

  const handleChoice = useCallback(
    (answer: number) => {
      if (!problem) return;
      setSelectedAnswer(answer);
      if (answer === problem.correctAnswer) {
        setCorrectCount((prev) => prev + 1);
      } else {
        setIncorrectCount((prev) => prev + 1);
      }
      setTimeout(() => {
        generateNewProblem(operation, selectedConfigKey);
      }, 1000);
    },
    [problem, generateNewProblem, operation, selectedConfigKey],
  );

  useEffect(() => {
    const storedProgress = readStoredProgress();
    setCorrectCount(storedProgress.correctCount);
    setIncorrectCount(storedProgress.incorrectCount);
    setIsProgressLoaded(true);
  }, []);

  useEffect(() => {
    if (operation) {
      const initialConfig = operationConfigs[operation]?.[0];
      if (initialConfig) {
        setSelectedConfigKey(initialConfig.key);
      }
    }
  }, [operation]);

  useEffect(() => {
    if (operation && selectedConfigKey) {
      generateNewProblem(operation, selectedConfigKey);
    }
  }, [operation, selectedConfigKey, generateNewProblem]);

  useEffect(() => {
    if (!isProgressLoaded) return;

    writeStoredProgress({
      correctCount,
      incorrectCount,
    });
  }, [correctCount, incorrectCount, isProgressLoaded]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");

    const onKeyDown = (event: KeyboardEvent) => {
      if (!mq.matches) return;
      if (event.repeat) return;
      if (event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;
      if (!problem || selectedAnswer !== null) return;

      let digit: number | null = null;
      if (event.code.startsWith("Digit")) {
        digit = Number.parseInt(event.code.slice("Digit".length), 10);
      } else if (event.code.startsWith("Numpad")) {
        digit = Number.parseInt(event.code.slice("Numpad".length), 10);
      }

      if (digit === null || digit < 1 || digit > 4) return;

      const choice = problem.choices[digit - 1];
      if (choice === undefined) return;

      event.preventDefault();
      handleChoice(choice);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [problem, selectedAnswer, handleChoice]);

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-teal-500 to-cyan-400 dark:from-gray-800 dark:to-gray-900 text-white transition-colors duration-300">
        Carregando...
      </div>
    );
  }

  return (
    <div
      className="relative h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col items-stretch
        bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-400 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950
        px-3 pt-11 pb-4 sm:px-4 sm:pt-14 sm:pb-6 transition-colors duration-300"
    >
      <button
        onClick={() => router.push("/")}
        className="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-900/55 backdrop-blur-xl border border-white/40 dark:border-white/20 dark:text-white hover:bg-white dark:hover:bg-slate-800 text-black font-bold py-2.5 px-5 rounded-xl transition-colors sm:top-4 sm:left-4"
      >
        Voltar
      </button>

      <div className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-col flex-1 min-h-0 w-full max-w-6xl mx-auto items-center justify-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl text-white font-bold mb-2 text-center drop-shadow-sm leading-tight px-1">
          Praticando {translateOperation(problem.operation)}
        </h1>
        <p className="hidden md:block text-white/90 text-sm mb-5 text-center">
          No desktop, use as teclas{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-semibold">
            1
          </kbd>
          {" – "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-semibold">
            4
          </kbd>{" "}
          para responder.
        </p>

        <div
          className="w-full rounded-2xl border border-white/40 dark:border-white/20
            bg-white/90 dark:bg-slate-900/55 backdrop-blur-xl shadow-2xl shadow-black/15 dark:shadow-black/40
            p-5 sm:p-6 md:p-8 transition-colors duration-300"
        >
          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-amber-200/80 dark:border-amber-400/20 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                      Progresso
                    </div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      Level {playerProgress.level}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Pontos
                    </div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {playerProgress.points}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>
                      {playerProgress.progressInLevel} /{" "}
                      {playerProgress.nextLevelThreshold -
                        playerProgress.currentLevelThreshold}
                    </span>
                    <span>Faltam {playerProgress.pointsNeeded} pontos</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-300"
                      style={{ width: `${playerProgress.progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Próximo level em {playerProgress.nextLevelThreshold} pontos totais
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Resultado
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                      Acertos
                    </div>
                    <div className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                      {correctCount}
                    </div>
                  </div>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-400">
                      Erros
                    </div>
                    <div className="mt-1 text-2xl font-bold text-rose-800 dark:text-rose-300">
                      {incorrectCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <label className="block w-full mb-5">
                <span className="block text-sm font-semibold mb-2 text-slate-800 dark:text-white">
                  Configuração
                </span>
                <select
                  value={selectedConfigKey}
                  onChange={(event) => setSelectedConfigKey(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {operationConfigs[problem.operation].map((config) => (
                    <option key={config.key} value={config.key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-center text-slate-900 dark:text-white">
                {problem.expression}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                {problem.choices.map((c, index) => {
                  const shortcut = index + 1;
                  const isSelected = selectedAnswer === c;
                  const isCorrect = c === problem.correctAnswer;
                  let choiceClass =
                    "group relative min-h-[88px] sm:min-h-[108px] rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold px-4 py-4 transition-colors";
                  if (selectedAnswer !== null) {
                    if (isSelected && isCorrect) {
                      choiceClass =
                        "group relative min-h-[88px] sm:min-h-[108px] rounded-xl border border-green-500 bg-green-500 text-white font-bold px-4 py-4";
                    } else if (isSelected && !isCorrect) {
                      choiceClass =
                        "group relative min-h-[88px] sm:min-h-[108px] rounded-xl border border-red-500 bg-red-500 text-white font-bold px-4 py-4";
                    }
                  }

                  return (
                    <button
                      key={c}
                      onClick={() => handleChoice(c)}
                      disabled={selectedAnswer !== null}
                      className={choiceClass}
                      aria-label={`Alternativa ${shortcut}: ${c}`}
                    >
                      <span className="absolute top-2 right-2 hidden md:flex items-center justify-center rounded-md border border-current/20 bg-black/10 dark:bg-white/10 px-2 py-1 text-[10px] font-mono">
                        {shortcut}
                      </span>
                      <span className="flex h-full items-center justify-center text-xl sm:text-2xl">
                        {c}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <PracticePageContent />
    </Suspense>
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

function getConfigForOperation(op: Operation, configKey: string) {
  const configs = operationConfigs[op];
  return configs.find((config) => config.key === configKey) ?? configs[0];
}

function isRangeConfig(config: ConfigOption): config is RangeConfig {
  return "min" in config && "max" in config && !("fixed" in config);
}

function isMultiplicationConfig(
  config: ConfigOption,
): config is MultiplicationConfig {
  return "min" in config && "max" in config;
}

function isDivisionConfig(config: ConfigOption): config is DivisionConfig {
  return "max" in config && !("min" in config);
}

function getMaxWrongAnswer(
  op: Operation,
  config: ConfigOption,
  correct: number,
) {
  if (op === "addition" && isRangeConfig(config)) {
    return config.max * 2;
  }

  if (op === "subtraction" && isRangeConfig(config)) {
    return config.max - config.min;
  }

  if (op === "multiplication" && isMultiplicationConfig(config)) {
    const firstFactor = config.fixed ?? config.max;
    return firstFactor * config.max;
  }

  if (op === "division" && isDivisionConfig(config)) {
    return config.max;
  }

  return Math.max(correct + 10, 20);
}

function readStoredProgress(): StoredProgress {
  if (typeof window === "undefined") {
    return { correctCount: 0, incorrectCount: 0 };
  }

  try {
    const rawValue = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!rawValue) {
      return { correctCount: 0, incorrectCount: 0 };
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredProgress>;
    return {
      correctCount: sanitizeCount(parsedValue.correctCount),
      incorrectCount: sanitizeCount(parsedValue.incorrectCount),
    };
  } catch {
    return { correctCount: 0, incorrectCount: 0 };
  }
}

function writeStoredProgress(progress: StoredProgress) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function sanitizeCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function calculatePlayerProgress(
  correctCount: number,
  incorrectCount: number,
): PlayerProgress {
  const points = Math.max(correctCount - incorrectCount, 0);
  const thresholds = [10];

  while (thresholds[thresholds.length - 1] <= points) {
    thresholds.push(Math.round(thresholds[thresholds.length - 1] * 1.2));
  }

  let level = 0;
  while (level < thresholds.length && points >= thresholds[level]) {
    level += 1;
  }

  const currentLevelThreshold = level === 0 ? 0 : thresholds[level - 1];
  const nextLevelThreshold = thresholds[level];
  const levelRange = nextLevelThreshold - currentLevelThreshold;
  const progressInLevel = points - currentLevelThreshold;
  const pointsNeeded = Math.max(nextLevelThreshold - points, 0);
  const progressPercent =
    levelRange === 0 ? 100 : Math.min((progressInLevel / levelRange) * 100, 100);

  return {
    points,
    level,
    currentLevelThreshold,
    nextLevelThreshold,
    progressInLevel,
    pointsNeeded,
    progressPercent,
  };
}
