"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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

type Difficulty = "easy" | "medium" | "hard";

interface Problem {
  a: number;
  b: number;
  operation: Operation;
  correctAnswer: number;
  choices: number[];
  expression: string;
}

type Attempt = {
  expression: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
};

type StoredProgress = {
  correctCount: number;
  incorrectCount: number;
  totalStudyTimeMs: number;
  timeByLevel: Record<string, number>;
  currentLevel: number;
  attempts: Attempt[];
};

type LegacyStoredProgress = {
  correctCount?: number;
  incorrectCount?: number;
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

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Médio" },
  { value: "hard", label: "Difícil" },
];

const LEGACY_PROGRESS_STORAGE_KEY = "math-app-progress-v3";
const PROGRESS_STORAGE_KEY = "math-app-progress-v4";
const STUDY_TIME_FLUSH_INTERVAL_MS = 5000;

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
  const [totalStudyTimeMs, setTotalStudyTimeMs] = useState(0);
  const [timeByLevel, setTimeByLevel] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedConfigKey, setSelectedConfigKey] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("medium");
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [activeStudySessionMs, setActiveStudySessionMs] = useState(0);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isAttemptDetailsVisible, setIsAttemptDetailsVisible] = useState(false);
  const [areAttemptFieldsCompact, setAreAttemptFieldsCompact] = useState(true);

  const sessionStartedAtRef = useRef<number | null>(null);
  const latestProgressRef = useRef<StoredProgress>(createEmptyStoredProgress());
  const currentLevelRef = useRef(1);

  const playerProgress = calculatePlayerProgress(correctCount, incorrectCount);
  const displayedTotalStudyTimeMs = totalStudyTimeMs + activeStudySessionMs;
  const activeLevelKey = String(playerProgress.level);
  const displayedTimeByLevel = {
    ...timeByLevel,
    [activeLevelKey]:
      sanitizeCount(timeByLevel[activeLevelKey]) + activeStudySessionMs,
  };
  const visibleLevels = Array.from(
    new Set<number>([
      playerProgress.level,
      ...Object.keys(displayedTimeByLevel)
        .map((key) => Number.parseInt(key, 10))
        .filter((level) => Number.isFinite(level) && level > 0),
    ]),
  ).sort((left, right) => left - right);
  const correctAttempts = attempts.filter((attempt) => attempt.isCorrect);
  const incorrectAttempts = attempts.filter((attempt) => !attempt.isCorrect);

  const persistProgress = useCallback((progress: StoredProgress) => {
    writeStoredProgress(progress);
    latestProgressRef.current = progress;
  }, []);

  const startActiveStudySession = useCallback(() => {
    if (!isProgressLoaded) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    if (sessionStartedAtRef.current !== null) return;

    sessionStartedAtRef.current = Date.now();
    setActiveStudySessionMs(0);
  }, [isProgressLoaded]);

  const flushActiveStudyTime = useCallback(
    (pauseTimer: boolean, levelOverride?: number) => {
      const startedAt = sessionStartedAtRef.current;
      if (startedAt === null) return;

      const now = Date.now();
      const elapsedMs = Math.max(now - startedAt, 0);
      const trackedLevel = levelOverride ?? currentLevelRef.current;

      if (elapsedMs > 0) {
        const levelKey = String(trackedLevel);
        const currentProgress = latestProgressRef.current;
        const nextProgress: StoredProgress = {
          ...currentProgress,
          totalStudyTimeMs: currentProgress.totalStudyTimeMs + elapsedMs,
          timeByLevel: {
            ...currentProgress.timeByLevel,
            [levelKey]:
              sanitizeCount(currentProgress.timeByLevel[levelKey]) + elapsedMs,
          },
          currentLevel: currentLevelRef.current,
        };

        setTotalStudyTimeMs(nextProgress.totalStudyTimeMs);
        setTimeByLevel(nextProgress.timeByLevel);
        persistProgress(nextProgress);
      }

      sessionStartedAtRef.current = pauseTimer ? null : now;
      setActiveStudySessionMs(0);
    },
    [persistProgress],
  );

  const generateChoices = useCallback(
    (currentProblem: Problem, config: ConfigOption, difficulty: Difficulty) => {
      const choicesSet = new Set<number>();
      choicesSet.add(currentProblem.correctAnswer);
      const candidates = buildWrongAnswerCandidates(
        currentProblem,
        config,
        difficulty,
      );

      for (const candidate of candidates) {
        if (choicesSet.size >= 4) break;
        if (candidate > 0 && candidate !== currentProblem.correctAnswer) {
          choicesSet.add(candidate);
        }
      }

      while (choicesSet.size < 4) {
        const fallback = createNearbyFallbackAnswer(
          currentProblem.correctAnswer,
          choicesSet.size,
          difficulty,
        );
        if (fallback !== currentProblem.correctAnswer && fallback > 0) {
          choicesSet.add(fallback);
        }
      }

      return Array.from(choicesSet).sort(() => Math.random() - 0.5);
    },
    [],
  );

  const generateNewProblem = useCallback(
    (op: Operation, configKey: string, difficulty: Difficulty) => {
      const config = getConfigForOperation(op, configKey);
      let a = 0;
      let b = 0;
      let correctAnswer = 0;
      let expression = "";

      if (op === "addition" && isRangeConfig(config)) {
        a = randomInt(config.min, config.max);
        b = randomInt(config.min, config.max);
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
        a = config.fixed ?? randomInt(config.min, config.max);
        b = randomInt(config.min, config.max);
        correctAnswer = a * b;
        expression = `${a} x ${b}`;
      } else if (op === "division" && isDivisionConfig(config)) {
        b = randomInt(1, config.max);
        correctAnswer = randomInt(1, Math.max(1, Math.floor(config.max / b)));
        a = b * correctAnswer;
        expression = `${a} ÷ ${b}`;
      }

      const nextProblem: Problem = {
        a,
        b,
        operation: op,
        correctAnswer,
        choices: [],
        expression,
      };

      nextProblem.choices = generateChoices(nextProblem, config, difficulty);
      setProblem(nextProblem);
      setSelectedAnswer(null);
    },
    [generateChoices],
  );

  const handleChoice = useCallback(
    (answer: number) => {
      if (!problem) return;

      const isCorrect = answer === problem.correctAnswer;
      const nextAttempt: Attempt = {
        expression: problem.expression,
        selectedAnswer: answer,
        correctAnswer: problem.correctAnswer,
        isCorrect,
      };

      setSelectedAnswer(answer);
      setAttempts((prev) => [...prev, nextAttempt]);
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
      } else {
        setIncorrectCount((prev) => prev + 1);
      }

      window.setTimeout(() => {
        generateNewProblem(operation, selectedConfigKey, selectedDifficulty);
      }, 1000);
    },
    [generateNewProblem, operation, problem, selectedConfigKey, selectedDifficulty],
  );

  const handleResetProgress = useCallback(() => {
    flushActiveStudyTime(true);
    clearStoredProgress();

    const resetProgress = createEmptyStoredProgress();
    latestProgressRef.current = resetProgress;
    currentLevelRef.current = 1;
    sessionStartedAtRef.current = null;

    setCorrectCount(0);
    setIncorrectCount(0);
    setTotalStudyTimeMs(0);
    setTimeByLevel({});
    setAttempts([]);
    setActiveStudySessionMs(0);

    persistProgress(resetProgress);
    startActiveStudySession();
  }, [flushActiveStudyTime, persistProgress, startActiveStudySession]);

  const handleOpenProgressModal = useCallback(() => {
    setIsAttemptDetailsVisible(false);
    setAreAttemptFieldsCompact(true);
    setIsProgressModalOpen(true);
  }, []);

  const handleCloseProgressModal = useCallback(() => {
    setIsProgressModalOpen(false);
  }, []);

  useEffect(() => {
    if (!isProgressModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      handleCloseProgressModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCloseProgressModal, isProgressModalOpen]);

  useEffect(() => {
    const storedProgress = readStoredProgress();
    setCorrectCount(storedProgress.correctCount);
    setIncorrectCount(storedProgress.incorrectCount);
    setTotalStudyTimeMs(storedProgress.totalStudyTimeMs);
    setTimeByLevel(storedProgress.timeByLevel);
    setAttempts(storedProgress.attempts);
    latestProgressRef.current = storedProgress;
    currentLevelRef.current = storedProgress.currentLevel;
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
      generateNewProblem(operation, selectedConfigKey, selectedDifficulty);
    }
  }, [generateNewProblem, operation, selectedConfigKey, selectedDifficulty]);

  useEffect(() => {
    if (!isProgressLoaded) return;

    persistProgress({
      correctCount,
      incorrectCount,
      totalStudyTimeMs,
      timeByLevel,
      currentLevel: playerProgress.level,
      attempts,
    });
  }, [
    attempts,
    correctCount,
    incorrectCount,
    isProgressLoaded,
    persistProgress,
    playerProgress.level,
    timeByLevel,
    totalStudyTimeMs,
  ]);

  useEffect(() => {
    if (!isProgressLoaded) return;

    const previousLevel = currentLevelRef.current;
    if (playerProgress.level === previousLevel) return;

    flushActiveStudyTime(false, previousLevel);
    currentLevelRef.current = playerProgress.level;
    latestProgressRef.current = {
      ...latestProgressRef.current,
      currentLevel: playerProgress.level,
    };
  }, [flushActiveStudyTime, isProgressLoaded, playerProgress.level]);

  useEffect(() => {
    if (!isProgressLoaded) return;

    startActiveStudySession();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startActiveStudySession();
        return;
      }

      flushActiveStudyTime(true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushActiveStudyTime(true);
    };
  }, [flushActiveStudyTime, isProgressLoaded, startActiveStudySession]);

  useEffect(() => {
    if (!isProgressLoaded) return;

    const intervalId = window.setInterval(() => {
      const startedAt = sessionStartedAtRef.current;
      if (startedAt === null) return;

      setActiveStudySessionMs(Math.max(Date.now() - startedAt, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isProgressLoaded]);

  useEffect(() => {
    if (!isProgressLoaded) return;

    const intervalId = window.setInterval(() => {
      flushActiveStudyTime(false);
    }, STUDY_TIME_FLUSH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [flushActiveStudyTime, isProgressLoaded]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");

    const onKeyDown = (event: KeyboardEvent) => {
      if (!mq.matches) return;
      if (event.repeat) return;
      if (event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;
      if (isProgressModalOpen) return;
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
  }, [handleChoice, isProgressModalOpen, problem, selectedAnswer]);

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-teal-500 to-cyan-400 dark:from-gray-800 dark:to-gray-900 text-white transition-colors duration-300">
        Carregando...
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[100dvh] overflow-y-auto overflow-x-hidden md:h-[100dvh] md:max-h-[100dvh] md:overflow-hidden flex flex-col items-stretch
        bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-400 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950
        px-3 pt-12 pb-4 sm:px-4 sm:pt-14 sm:pb-6 transition-colors duration-300"
    >
      <button
        onClick={() => router.push("/")}
        className="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-900/55 backdrop-blur-xl border border-white/40 dark:border-white/20 dark:text-white hover:bg-white dark:hover:bg-slate-800 text-black font-bold py-2 px-4 rounded-xl transition-colors sm:top-4 sm:left-4 sm:py-2.5 sm:px-5"
      >
        Voltar
      </button>

      <div className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-col flex-1 min-h-0 w-full max-w-md lg:max-w-6xl mx-auto items-center justify-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl text-white font-bold mb-1 sm:mb-2 text-center drop-shadow-sm leading-tight px-1">
          Praticando {translateOperation(problem.operation)}
        </h1>
        <p className="text-white/90 text-sm mb-4 text-center md:hidden">
          Escolha a configuração e toque na resposta.
        </p>
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
            p-4 sm:p-6 md:p-8 transition-colors duration-300"
        >
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="rounded-2xl border border-amber-200/80 dark:border-amber-400/20 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                      Progresso
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      Level {playerProgress.level}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Acertos
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {playerProgress.points}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>Tempo total</span>
                    <span>{formatDuration(displayedTotalStudyTimeMs)}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>
                      {playerProgress.progressInLevel} /{" "}
                      {playerProgress.nextLevelThreshold -
                        playerProgress.currentLevelThreshold}
                    </span>
                    <span>Faltam {playerProgress.pointsNeeded} acertos</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-300"
                      style={{ width: `${playerProgress.progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Próximo level em {playerProgress.nextLevelThreshold} acertos totais
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 p-3.5 sm:p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Resultado
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-3 sm:px-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                      Acertos
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                      {correctCount}
                    </div>
                  </div>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-3 sm:px-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-400">
                      Erros
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-rose-800 dark:text-rose-300">
                      {incorrectCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Histórico
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenProgressModal}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/70"
                  >
                    Ver progresso e histórico
                  </button>
                </div>
                <div className="mt-3 rounded-xl bg-slate-100/80 px-3 py-3 text-sm text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <span>Tempo acumulado</span>
                    <span className="font-semibold">
                      {formatDuration(displayedTotalStudyTimeMs)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="grid gap-3 mb-4 sm:mb-5 md:grid-cols-2">
                <label className="block w-full">
                  <span className="block text-sm font-semibold mb-2 text-slate-800 dark:text-white">
                    Configuração
                  </span>
                  <select
                    value={selectedConfigKey}
                    onChange={(event) => setSelectedConfigKey(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm text-slate-900 dark:text-white"
                  >
                    {operationConfigs[problem.operation].map((config) => (
                      <option key={config.key} value={config.key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block w-full">
                  <span className="block text-sm font-semibold mb-2 text-slate-800 dark:text-white">
                    Dificuldade
                  </span>
                  <select
                    value={selectedDifficulty}
                    onChange={(event) =>
                      setSelectedDifficulty(event.target.value as Difficulty)
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm text-slate-900 dark:text-white"
                  >
                    {difficultyOptions.map((difficulty) => (
                      <option key={difficulty.value} value={difficulty.value}>
                        {difficulty.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="text-[2rem] sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-center text-slate-900 dark:text-white">
                {problem.expression}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                {problem.choices.map((choice, index) => {
                  const shortcut = index + 1;
                  const isSelected = selectedAnswer === choice;
                  const isCorrect = choice === problem.correctAnswer;
                  let choiceClass =
                    "group relative min-h-[84px] sm:min-h-[108px] rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold px-3 py-3 sm:px-4 sm:py-4 transition-colors";

                  if (selectedAnswer !== null) {
                    if (isSelected && isCorrect) {
                      choiceClass =
                        "group relative min-h-[84px] sm:min-h-[108px] rounded-xl border border-green-500 bg-green-500 text-white font-bold px-3 py-3 sm:px-4 sm:py-4";
                    } else if (isSelected && !isCorrect) {
                      choiceClass =
                        "group relative min-h-[84px] sm:min-h-[108px] rounded-xl border border-red-500 bg-red-500 text-white font-bold px-3 py-3 sm:px-4 sm:py-4";
                    }
                  }

                  return (
                    <button
                      key={choice}
                      onClick={() => handleChoice(choice)}
                      disabled={selectedAnswer !== null}
                      className={choiceClass}
                      aria-label={`Alternativa ${shortcut}: ${choice}`}
                    >
                      <span className="absolute top-2 right-2 hidden md:flex items-center justify-center rounded-md border border-current/20 bg-black/10 dark:bg-white/10 px-2 py-1 text-[10px] font-mono">
                        {shortcut}
                      </span>
                      <span className="flex h-full items-center justify-center text-xl sm:text-2xl">
                        {choice}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isProgressModalOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseProgressModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="progress-modal-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-white p-4 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Resumo completo
                </div>
                <h2
                  id="progress-modal-title"
                  className="mt-1 text-xl font-bold sm:text-2xl"
                >
                  Seu progresso
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseProgressModal}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Level
                </div>
                <div className="mt-1 text-2xl font-bold">{playerProgress.level}</div>
              </div>
              <div className="rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Tempo total
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {formatDuration(displayedTotalStudyTimeMs)}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/30">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                  Acertos
                </div>
                <div className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {correctCount}
                </div>
              </div>
              <div className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-950/30">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-400">
                  Erros
                </div>
                <div className="mt-1 text-2xl font-bold text-rose-800 dark:text-rose-300">
                  {incorrectCount}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Tempo por level
              </div>
              <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                {visibleLevels.map((level) => (
                  <div
                    key={level}
                    className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
                  >
                    <span>Level {level}</span>
                    <span className="font-semibold">
                      {formatDuration(
                        sanitizeCount(displayedTimeByLevel[String(level)]),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setIsAttemptDetailsVisible((isVisible) => !isVisible)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-expanded={isAttemptDetailsVisible}
                >
                  {isAttemptDetailsVisible
                    ? "Ocultar erros e acertos"
                    : "Ver erros e acertos"}
                </button>

                {isAttemptDetailsVisible ? (
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={areAttemptFieldsCompact}
                      onChange={(event) =>
                        setAreAttemptFieldsCompact(event.target.checked)
                      }
                      className="h-4 w-4 accent-cyan-600"
                    />
                    Campos compactos
                  </label>
                ) : null}
              </div>

              {isAttemptDetailsVisible ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                      Lista de acertos
                    </div>
                    <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                      {correctAttempts.length > 0 ? (
                        correctAttempts.map((attempt, index) => (
                          <div
                            key={`${attempt.expression}-${attempt.selectedAnswer}-${index}`}
                            className={`rounded-xl bg-emerald-50 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 ${
                              areAttemptFieldsCompact
                                ? "px-3 py-2"
                                : "px-4 py-3"
                            }`}
                          >
                            {attempt.expression}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Nenhum acerto registrado ainda.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-400">
                      Lista de erros
                    </div>
                    <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                      {incorrectAttempts.length > 0 ? (
                        incorrectAttempts.map((attempt, index) => (
                          <div
                            key={`${attempt.expression}-${attempt.selectedAnswer}-${index}`}
                            className={`rounded-xl bg-rose-50 text-sm text-rose-950 dark:bg-rose-950/30 dark:text-rose-100 ${
                              areAttemptFieldsCompact
                                ? "px-3 py-2"
                                : "px-4 py-3"
                            }`}
                          >
                            <div className="font-semibold">
                              {attempt.expression}
                            </div>
                            <div
                              className={`text-xs text-rose-800 dark:text-rose-200 ${
                                areAttemptFieldsCompact ? "mt-0.5" : "mt-1"
                              }`}
                            >
                              Correta: {attempt.correctAnswer}
                            </div>
                            <div
                              className={`text-xs text-rose-800 dark:text-rose-200 ${
                                areAttemptFieldsCompact ? "mt-0.5" : "mt-1"
                              }`}
                            >
                              Respondida: {attempt.selectedAnswer}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Nenhum erro registrado ainda.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseProgressModal}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={handleResetProgress}
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

function buildWrongAnswerCandidates(
  problem: Problem,
  config: ConfigOption,
  difficulty: Difficulty,
) {
  const { a, b, operation, correctAnswer } = problem;
  const candidates = new Set<number>();
  const difficultyOffsets = getDifficultyOffsets(correctAnswer, difficulty);

  for (const offset of difficultyOffsets) {
    candidates.add(correctAnswer + offset);
    candidates.add(correctAnswer - offset);
  }

  if (operation === "addition") {
    candidates.add(Math.abs(a - b));
    candidates.add(correctAnswer + 10);
    candidates.add(correctAnswer - 10);
    candidates.add(roundToNearest(correctAnswer, 10));
    candidates.add(roundToNearest(correctAnswer, 100));
  }

  if (operation === "subtraction") {
    candidates.add(a + b);
    candidates.add(correctAnswer + b);
    candidates.add(Math.abs(correctAnswer - b));
    candidates.add(roundToNearest(correctAnswer, 10));
  }

  if (operation === "multiplication" && isMultiplicationConfig(config)) {
    const otherFactor = config.fixed ?? b;
    candidates.add(a + b);
    candidates.add(correctAnswer + a);
    candidates.add(correctAnswer - a);
    candidates.add(correctAnswer + otherFactor);
    candidates.add(Math.abs(correctAnswer - otherFactor));
    candidates.add(a * Math.max(b - 1, 1));
    candidates.add(a * (b + 1));
  }

  if (operation === "division" && isDivisionConfig(config)) {
    candidates.add(a / Math.max(b + 1, 1));
    candidates.add(a / Math.max(b - 1, 1));
    candidates.add(correctAnswer + 1);
    candidates.add(Math.max(correctAnswer - 1, 1));
    candidates.add(b);
  }

  return Array.from(candidates)
    .map((value) => Math.round(value))
    .filter(
      (value) =>
        Number.isFinite(value) && value > 0 && value !== correctAnswer,
    )
    .sort(
      (left, right) =>
        Math.abs(left - correctAnswer) - Math.abs(right - correctAnswer),
    );
}

function getDifficultyOffsets(correctAnswer: number, difficulty: Difficulty) {
  const magnitude = Math.max(Math.abs(correctAnswer), 10);

  if (difficulty === "easy") {
    return [
      Math.max(3, Math.round(magnitude * 0.35)),
      Math.max(6, Math.round(magnitude * 0.5)),
      Math.max(9, Math.round(magnitude * 0.7)),
      10,
    ];
  }

  if (difficulty === "hard") {
    return [
      1,
      2,
      Math.max(3, Math.round(magnitude * 0.03)),
      Math.max(4, Math.round(magnitude * 0.05)),
      Math.max(5, Math.round(magnitude * 0.08)),
    ];
  }

  return [
    2,
    Math.max(4, Math.round(magnitude * 0.1)),
    Math.max(6, Math.round(magnitude * 0.15)),
    Math.max(8, Math.round(magnitude * 0.22)),
  ];
}

function createNearbyFallbackAnswer(
  correctAnswer: number,
  seed: number,
  difficulty: Difficulty,
) {
  const step =
    difficulty === "easy"
      ? 7 + seed * 5
      : difficulty === "hard"
        ? 1 + seed
        : 3 + seed * 2;
  const direction = seed % 2 === 0 ? 1 : -1;
  return Math.max(correctAnswer + step * direction, 1);
}

function roundToNearest(value: number, factor: number) {
  if (factor <= 0) return value;
  return Math.round(value / factor) * factor;
}

function createEmptyStoredProgress(): StoredProgress {
  return {
    correctCount: 0,
    incorrectCount: 0,
    totalStudyTimeMs: 0,
    timeByLevel: {},
    currentLevel: 1,
    attempts: [],
  };
}

function readStoredProgress(): StoredProgress {
  if (typeof window === "undefined") {
    return createEmptyStoredProgress();
  }

  try {
    const rawValue = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (rawValue) {
      return normalizeStoredProgress(JSON.parse(rawValue));
    }

    const legacyRawValue = window.localStorage.getItem(
      LEGACY_PROGRESS_STORAGE_KEY,
    );
    if (legacyRawValue) {
      const legacyValue = JSON.parse(legacyRawValue) as LegacyStoredProgress;
      return normalizeStoredProgress({
        ...createEmptyStoredProgress(),
        correctCount: legacyValue.correctCount,
        incorrectCount: legacyValue.incorrectCount,
      });
    }

    return createEmptyStoredProgress();
  } catch {
    return createEmptyStoredProgress();
  }
}

function normalizeStoredProgress(value: unknown): StoredProgress {
  if (!value || typeof value !== "object") {
    return createEmptyStoredProgress();
  }

  const parsedValue = value as Partial<StoredProgress>;
  const normalizedProgress: StoredProgress = {
    correctCount: sanitizeCount(parsedValue.correctCount),
    incorrectCount: sanitizeCount(parsedValue.incorrectCount),
    totalStudyTimeMs: sanitizeCount(parsedValue.totalStudyTimeMs),
    timeByLevel: sanitizeTimeByLevel(parsedValue.timeByLevel),
    currentLevel: sanitizeCount(parsedValue.currentLevel) || 1,
    attempts: sanitizeAttempts(parsedValue.attempts),
  };

  return {
    ...normalizedProgress,
    currentLevel: calculatePlayerProgress(
      normalizedProgress.correctCount,
      normalizedProgress.incorrectCount,
    ).level,
  };
}

function sanitizeTimeByLevel(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, number>
  >((accumulator, [level, time]) => {
    const numericLevel = Number.parseInt(level, 10);
    if (!Number.isFinite(numericLevel) || numericLevel <= 0) {
      return accumulator;
    }

    accumulator[String(numericLevel)] = sanitizeCount(time);
    return accumulator;
  }, {});
}

function sanitizeAttempts(value: unknown): Attempt[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<Attempt[]>((accumulator, attempt) => {
    if (!attempt || typeof attempt !== "object") {
      return accumulator;
    }

    const parsedAttempt = attempt as Partial<Attempt>;
    if (
      typeof parsedAttempt.expression !== "string" ||
      typeof parsedAttempt.selectedAnswer !== "number" ||
      !Number.isFinite(parsedAttempt.selectedAnswer) ||
      typeof parsedAttempt.correctAnswer !== "number" ||
      !Number.isFinite(parsedAttempt.correctAnswer) ||
      typeof parsedAttempt.isCorrect !== "boolean"
    ) {
      return accumulator;
    }

    accumulator.push({
      expression: parsedAttempt.expression,
      selectedAnswer: Math.round(parsedAttempt.selectedAnswer),
      correctAnswer: Math.round(parsedAttempt.correctAnswer),
      isCorrect: parsedAttempt.isCorrect,
    });
    return accumulator;
  }, []);
}

function clearStoredProgress() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_PROGRESS_STORAGE_KEY);
}

function writeStoredProgress(progress: StoredProgress) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(Math.max(durationMs, 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function sanitizeCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function calculatePlayerProgress(
  correctCount: number,
  incorrectCount: number,
): PlayerProgress {
  void incorrectCount;
  const points = correctCount;
  let level = 1;
  let currentLevelThreshold = 0;
  let nextLevelThreshold = 5;
  let requiredCorrectAnswers = 5;

  while (points >= nextLevelThreshold) {
    level += 1;
    currentLevelThreshold = nextLevelThreshold;
    requiredCorrectAnswers += 1;
    nextLevelThreshold += requiredCorrectAnswers;
  }

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
