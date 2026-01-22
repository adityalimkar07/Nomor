import { useState, useEffect, useMemo, useCallback } from 'react';
import { readLS, writeLS } from '../utils/localStorageHelpers';
import { isToday, wasYesterday } from '../utils/dateHelpers';
import { callLLM } from '../api/llmService';
import { CAREER_TRACKS } from '../config/appConstants';

export const useChallenges = (selectedTrack, addCoins, addHistory) => {
  const getStorageKey = useCallback((key) => {
    if (!selectedTrack) return key; // Fallback for no track
    return `${key}_${selectedTrack}`;
  }, [selectedTrack]);

  // Initial State Loaders (run once on mount)
  // We use a dummy key for initial state if selectedTrack isn't set yet, 
  // but usually App.js initializes from LS before rendering.
  const [dsaStreak, setDsaStreak] = useState(() => readLS(selectedTrack ? `dsaStreak_${selectedTrack}` : "dsaStreak", 0));
  const [dsaCompleted, setDsaCompleted] = useState(() => readLS(selectedTrack ? `dsaCompleted_${selectedTrack}` : "dsaCompleted", false));
  const [lastDsaDate, setLastDsaDate] = useState(() => localStorage.getItem(selectedTrack ? `lastDsaDate_${selectedTrack}` : "lastDsaDate") || null);

  const [mcqQuestions, setMcqQuestions] = useState(() => readLS(selectedTrack ? `mcqQuestions_${selectedTrack}` : "mcqQuestions", []));
  const [mcqAnswers, setMcqAnswers] = useState(() => readLS(selectedTrack ? `mcqAnswers_${selectedTrack}` : "mcqAnswers", {}));
  const [mcqCompleted, setMcqCompleted] = useState(() => readLS(selectedTrack ? `mcqCompleted_${selectedTrack}` : "mcqCompleted", 0));
  const [lastMcqDate, setLastMcqDate] = useState(() => localStorage.getItem(selectedTrack ? `lastMcqDate_${selectedTrack}` : "lastMcqDate") || null);
  const [mcqStreak, setMcqStreak] = useState(() => readLS(selectedTrack ? `mcqStreak_${selectedTrack}` : "mcqStreak", 0));

  const [loadingMcq, setLoadingMcq] = useState(false);

  // Reload state when track switches
  useEffect(() => {
    if (!selectedTrack) return;
    const k = (suffix) => `${suffix}_${selectedTrack}`;

    setDsaStreak(readLS(k("dsaStreak"), 0));
    setDsaCompleted(readLS(k("dsaCompleted"), false));
    setLastDsaDate(localStorage.getItem(k("lastDsaDate")) || null);

    setMcqQuestions(readLS(k("mcqQuestions"), []));
    setMcqAnswers(readLS(k("mcqAnswers"), {}));
    setMcqCompleted(readLS(k("mcqCompleted"), 0));
    setLastMcqDate(localStorage.getItem(k("lastMcqDate")) || null);
    setMcqStreak(readLS(k("mcqStreak"), 0));

  }, [selectedTrack]);

  // Persist state changes (with tracknames)
  useEffect(() => {
    if (selectedTrack) writeLS(getStorageKey("dsaStreak"), dsaStreak);
  }, [dsaStreak, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack) writeLS(getStorageKey("dsaCompleted"), dsaCompleted);
  }, [dsaCompleted, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack && lastDsaDate) localStorage.setItem(getStorageKey("lastDsaDate"), lastDsaDate);
  }, [lastDsaDate, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack) writeLS(getStorageKey("mcqQuestions"), mcqQuestions);
  }, [mcqQuestions, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack) writeLS(getStorageKey("mcqAnswers"), mcqAnswers);
  }, [mcqAnswers, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack) writeLS(getStorageKey("mcqCompleted"), mcqCompleted);
  }, [mcqCompleted, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack && lastMcqDate) localStorage.setItem(getStorageKey("lastMcqDate"), lastMcqDate);
  }, [lastMcqDate, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack) writeLS(getStorageKey("mcqStreak"), mcqStreak);
  }, [mcqStreak, getStorageKey, selectedTrack]);


  // ===== DSA Challenge =====
  const completeDsaChallenge = () => {
    if (!selectedTrack) {
      alert("Select a track first!");
      return;
    }
    const today = new Date().toDateString();

    if (isToday(lastDsaDate)) {
      alert("You've already completed today's DSA challenge!");
      return;
    }

    let newStreak = dsaStreak;
    if (wasYesterday(lastDsaDate)) {
      newStreak = dsaStreak + 1;
    } else if (!lastDsaDate) {
      newStreak = 1;
    } else {
      newStreak = 1;
    }

    setDsaStreak(newStreak);
    setDsaCompleted(true);
    setLastDsaDate(today);

    addCoins(2, "DSA Challenge Completed 🎯");
    alert(`🎉 DSA Challenge Complete! Streak: ${newStreak} days. +2 coins earned!`);
  };

  // ===== MCQ Generation =====
  const generateMcqQuestions = async () => {
    if (!selectedTrack) {
      alert("Please select your career track first!");
      return;
    }

    const today = new Date().toDateString();

    if (isToday(lastMcqDate) && mcqQuestions.length > 0) {
      return; // Already have query for today
    }

    setLoadingMcq(true);

    try {
      const track = CAREER_TRACKS[selectedTrack];

      const prompt = `You are creating a daily quiz for aspiring ${track.name}s.

Generate exactly 15 multiple-choice questions focused on:
- Career: ${track.name}
- Key skills: ${track.skills.join(", ")}

Requirements:
1. Mix of difficulty levels (5 easy, 7 medium, 3 hard)
2. Cover different aspects of ${track.name} work
3. Each question has 4 options (A, B, C, D)
4. Only ONE correct answer per question
5. Questions should be practical and relevant

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "difficulty": "easy"
  }
]

The "correct" field is the index (0-3) of the correct option.
Generate all 15 questions now.`;

      const response = await callLLM(prompt);
      let jsonText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const questions = JSON.parse(jsonText);

      if (Array.isArray(questions) && questions.length === 15) {
        setMcqQuestions(questions);
        setLastMcqDate(today);
        setMcqAnswers({});
        setMcqCompleted(0);
      } else {
        throw new Error("Invalid question format");
      }

    } catch (error) {
      console.error("Error generating MCQ:", error);
      alert(`Failed to generate questions: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setLoadingMcq(false);
    }
  };

  // Fetch MCQ questions daily if selectedTrack is set and not already fetched today
  useEffect(() => {
    // Only generate if we have a track and EITHER no data OR old data
    if (selectedTrack && (!isToday(lastMcqDate) || mcqQuestions.length === 0)) {
      // Automatic generation only if pure reset, or explicit action?
      // The original code auto-generated.
      // We should check if lastMcqDate is today. If so, we LOADED it (above).
      // If not, we generate.
      // BUT avoid auto-generating immediately on track switch if we just haven't loaded yet?
      // The 'useEffect' for loading runs first? React docs say effects run after render.
      // We need to ensure we don't trigger generate before load.
      // Ideally we trust 'lastMcqDate' state.

      if (mcqQuestions.length === 0 && !loadingMcq && !isToday(lastMcqDate)) {
        generateMcqQuestions();
      }
    }
  }, [selectedTrack, lastMcqDate, mcqQuestions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== MCQ Answer Selection =====
  const selectMcqAnswer = (questionIndex, optionIndex) => {
    if (mcqAnswers[questionIndex] !== undefined) {
      return;
    }

    const question = mcqQuestions[questionIndex];
    const isCorrect = question.correct === optionIndex;

    setMcqAnswers(prev => ({
      ...prev,
      [questionIndex]: {
        selected: optionIndex,
        correct: isCorrect
      }
    }));

    const newCompleted = mcqCompleted + 1;
    setMcqCompleted(newCompleted);

    if (isCorrect) {
      addCoins(0.2, `MCQ ${questionIndex + 1} - Correct ✓`);
    } else {
      addHistory({
        type: "info",
        reason: `MCQ ${questionIndex + 1} - Incorrect ✗`,
        amount: 0,
        ts: Date.now()
      });
    }

    if (newCompleted === 15) {

      let newStreak = mcqStreak;
      if (wasYesterday(lastMcqDate)) {
        newStreak = mcqStreak + 1;
      } else if (!lastMcqDate) {
        newStreak = 1;
      } else {
        newStreak = 1;
      }

      setMcqStreak(newStreak);

      const correctCount = Object.values(mcqAnswers).filter(a => a.correct).length + (isCorrect ? 1 : 0);
      const score = Math.round((correctCount / 15) * 100);

      setTimeout(() => {
        alert(`🎉 MCQ Challenge Complete!\n\nScore: ${score}%\nCorrect: ${correctCount}/15\nStreak: ${newStreak} days`);
      }, 500);
    }
  };

  const mcqScore = useMemo(() => {
    if (mcqQuestions.length === 0) return null;
    const correctCount = Object.values(mcqAnswers).filter(a => a.correct).length;
    const totalAnswered = Object.keys(mcqAnswers).length;
    return {
      correct: correctCount,
      total: totalAnswered,
      percentage: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
    };
  }, [mcqAnswers, mcqQuestions]);

  // ===== Challenge Reset Logic =====
  useEffect(() => {
    // Only verify reset if we are on a valid track date
    if (!selectedTrack) return;

    if (lastDsaDate && !isToday(lastDsaDate)) {
      if (!wasYesterday(lastDsaDate)) {
        setDsaStreak(0);
      }
      setDsaCompleted(false);
    }

    if (lastMcqDate && !isToday(lastMcqDate)) {
      if (!wasYesterday(lastMcqDate)) {
        setMcqStreak(0);
      }
      // Don't clear questions here immediately, generateMcqQuestions handles new day logic
      // But we should reset completion status if it's a new day
      if (mcqCompleted > 0 && mcqQuestions.length > 0) {
        // If it's a new day, we usually clear.
        setMcqQuestions([]);
        setMcqAnswers({});
        setMcqCompleted(0);
      }
    }
  }, [lastDsaDate, lastMcqDate, selectedTrack]);

  return {
    dsaStreak,
    dsaCompleted,
    mcqQuestions,
    mcqAnswers,
    mcqCompleted,
    mcqStreak,
    loadingMcq,
    completeDsaChallenge,
    generateMcqQuestions,
    selectMcqAnswer,
    mcqScore,
  };
};
