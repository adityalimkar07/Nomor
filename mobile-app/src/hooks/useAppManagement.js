import { useState, useEffect, useRef, useMemo } from 'react';
import { readLS, writeLS } from '../utils/localStorageHelpers';
import { getApiKey, callLLM } from '../api/llmService';
import { COINS_TO_MINUTES } from '../config/appConstants';

export const useAppManagement = (addHistory, spendCoins, now) => {
  const [gameApps, setGameApps] = useState(() => readLS("gameApps", []));
  const [musicApps, setMusicApps] = useState(() => readLS("musicApps", []));
  const [pApps, setPApps] = useState(() => readLS("pApps", []));

  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedMusicId, setSelectedMusicId] = useState("");
  const [selectedPId, setSelectedPId] = useState("");

  const [activeSession, setActiveSession] = useState(() => readLS("activeSession", null));
  const [modal, setModal] = useState({ open: false, category: null, coins: 1 });

  // ===== Auto-categorization =====
  const [autoCategorized, setAutoCategorized] = useState(() =>
    localStorage.getItem("autoCategorized") === "true"
  );
  const [categorizing, setCategorizing] = useState(false);
  const autoCategorizeAttempted = useRef(false);

  const hasElectron = typeof window !== "undefined" && window.electronAPI;

  useEffect(() => writeLS("gameApps", gameApps), [gameApps]);
  useEffect(() => writeLS("musicApps", musicApps), [musicApps]);
  useEffect(() => writeLS("pApps", pApps), [pApps]);
  useEffect(() => writeLS("activeSession", activeSession), [activeSession]);

  // ===== Manage Apps =====
  const addAppToList = (type) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const app = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        path: file.path || file.name,
      };
      if (type === "game") setGameApps((l) => [...l, app]);
      if (type === "music") setMusicApps((l) => [...l, app]);
      if (type === "p") setPApps((l) => [...l, app]);
    };
    input.click();
  };

  const removeAppFromList = (type, id) => {
    if (type === "game") setGameApps((l) => l.filter((a) => a.id !== id));
    if (type === "music") setMusicApps((l) => l.filter((a) => a.id !== id));
    if (type === "p") setPApps((l) => l.filter((a) => a.id !== id));
  };

  // ===== Auto-categorization System =====
  const autoCategorizeApps = async (force = false) => {
    const allApps = [...gameApps, ...musicApps, ...pApps];

    // If no apps exist, nothing to categorize
    if (allApps.length === 0) {
      setAutoCategorized(true);
      return;
    }

    // If already categorized and not forcing, skip
    if (autoCategorized && !force) {
      return;
    }

    // Backend handles the API key now.
    // const apiKey = getApiKey();
    // if (!apiKey) { ... }

    setCategorizing(true);

    try {
      const appNames = allApps.map(app => app.name).join(", ");

      const prompt = `You are an app categorization assistant. Categorize the following apps into three categories: "games", "music", or "other".

Apps to categorize: ${appNames}

Return ONLY a valid JSON object in this exact format (no markdown, no backticks):
{
  "games": ["app1.exe", "app2.exe"],
  "music": ["app3.exe", "app4.exe"],
  "other": ["app5.exe", "app6.exe"]
}

Rules:
- "games": Video games, gaming applications, game launchers
- "music": Music players, streaming services, audio editing tools
- "other": Everything else (social media, productivity, browsers, etc.)

Use the exact app names provided. Return only the JSON object.`;

      const response = await callLLM(prompt);
      let jsonText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const categorization = JSON.parse(jsonText);

      // Create maps for quick lookup
      const gamesMap = new Set(categorization.games || []);
      const musicMap = new Set(categorization.music || []);

      // Categorize apps
      const newGameApps = [];
      const newMusicApps = [];
      const newPApps = [];

      allApps.forEach(app => {
        if (gamesMap.has(app.name)) {
          newGameApps.push(app);
        } else if (musicMap.has(app.name)) {
          newMusicApps.push(app);
        } else {
          newPApps.push(app);
        }
      });

      // Update state
      setGameApps(newGameApps);
      setMusicApps(newMusicApps);
      setPApps(newPApps);
      setAutoCategorized(true);

      addHistory({
        type: "info",
        reason: `Auto-categorized ${allApps.length} apps using AI`,
        amount: 0,
        ts: Date.now(),
      });

    } catch (error) {
      console.error("Error auto-categorizing apps:", error);
      // If categorization fails, mark as done to avoid retrying
      setAutoCategorized(true);
    } finally {
      setCategorizing(false);
    }
  };

  // ===== Auto-categorization on first use =====
  useEffect(() => {
    // Auto-categorize if apps exist but haven't been categorized yet
    // Only attempt once per session
    if (autoCategorizeAttempted.current) return;

    const totalApps = gameApps.length + musicApps.length + pApps.length;
    if (totalApps > 0 && !autoCategorized && !categorizing) {
      autoCategorizeAttempted.current = true;
      // Use setTimeout to avoid calling during render
      const timer = setTimeout(() => {
        autoCategorizeApps();
      }, 1000); // Small delay to ensure component is fully mounted
      return () => clearInterval(timer);
    }
  }, [gameApps, musicApps, pApps, autoCategorized, categorizing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Session Management =====
  const startTimedSession = async (category, coinsToSpend, app) => {
    const perCoin = COINS_TO_MINUTES[category];
    const totalMinutes = perCoin * coinsToSpend;
    if (totalMinutes <= 0) return;

    const ok = spendCoins(coinsToSpend, `${category.toUpperCase()} - ${app?.name || "Unknown app"} (${totalMinutes}m)`);
    if (!ok) return;

    if (activeSession && hasElectron) {
      try { await window.electronAPI.stopApp(); } catch { }
    }

    const endsAt = Date.now() + totalMinutes * 60 * 1000;
    const session = {
      category,
      appId: app?.id || null,
      appName: app?.name || "",
      appPath: app?.path || "",
      startedAt: Date.now(),
      endsAt,
    };
    setActiveSession(session);

    if (hasElectron && app?.path) {
      try {
        await window.electronAPI.startApp({
          filePath: app.path,
          durationMinutes: totalMinutes,
        });
      } catch (e) {
        console.error(e);
        alert("Failed to start the app via Electron.");
      }
    }
  };

  const stopSession = async (reason = "Stopped") => {
    if (!activeSession) return;
    if (hasElectron) {
      try { await window.electronAPI.stopApp(); } catch { }
    }
    addHistory({
      type: "info",
      reason: `Session ended: ${activeSession.category.toUpperCase()} - ${activeSession.appName} (${reason})`,
      amount: 0,
      ts: Date.now(),
    });
    setActiveSession(null);
  };

  useEffect(() => {
    if (!activeSession) return;
    const tick = setInterval(() => {
      if (Date.now() >= activeSession.endsAt) {
        clearInterval(tick);
        stopSession("Time expired");
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [activeSession?.endsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = useMemo(() => {
    if (!activeSession) return null;
    const ms = Math.max(0, activeSession.endsAt - now.getTime());
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [now, activeSession]);

  const askCoinsAndStart = (category) => {
    const map = { game: gameApps, music: musicApps, p: pApps };
    const list = map[category] || [];
    if (!list.length) {
      alert(`No ${category} apps added yet.`);
      return;
    }
    setModal({ open: true, category, coins: 1 });
  };

  const startFromModal = () => {
    const { category, coins } = modal;
    const map = { game: gameApps, music: musicApps, p: pApps };
    const list = map[category] || [];
    const selectedId =
      category === "game" ? selectedGameId :
        category === "music" ? selectedMusicId :
          selectedPId;

    const app = list.find((a) => a.id === selectedId) || list[0];
    startTimedSession(category, Number(coins), app);
    setModal({ open: false, category: null, coins: 1 });
  };

  return {
    gameApps,
    setGameApps,
    musicApps,
    setMusicApps,
    pApps,
    setPApps,
    selectedGameId,
    setSelectedGameId,
    selectedMusicId,
    setSelectedMusicId,
    selectedPId,
    setSelectedPId,
    activeSession,
    modal,
    setModal,
    autoCategorized,
    categorizing,
    autoCategorizeApps,
    addAppToList,
    removeAppFromList,
    startTimedSession,
    stopSession,
    remaining,
    askCoinsAndStart,
    startFromModal,
    hasElectron,
  };
};
