import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

import { readLS, writeLS } from './utils/localStorageHelpers';
import { getTimeUntilMidnight } from './utils/dateHelpers';
import { getApiKey, setApiKey } from './api/llmService';
import { CAREER_TRACKS, schedule, COINS_TO_MINUTES } from './config/appConstants';

import { useMotivation } from './hooks/useMotivation';
import { useChallenges } from './hooks/useChallenges';
import { useAppManagement } from './hooks/useAppManagement';

export default function App() {
  // ===== Core State =====
  const [now, setNow] = useState(new Date());

  // ===== Track Selection =====
  const [selectedTrack, setSelectedTrack] = useState(() =>
    localStorage.getItem("selectedTrack") || null
  );
  const [showOnboarding, setShowOnboarding] = useState(() =>
    !localStorage.getItem("selectedTrack")
  );

  // ===== Motivation System =====
  const { motivationQuote, motivationLoading, lastMotivationDate, fetchMotivation } =
    useMotivation(selectedTrack);

  // ===== Coin System =====
  const [coins, setCoins] = useState(() => {
    const raw = localStorage.getItem("coins");
    return raw ? parseFloat(raw) : 0;
  });
  const [history, setHistory] = useState(() => readLS("history", []));

  // ===== History & Coins =====
  const addHistory = (entry) => {
    setHistory((prev) => [{ ...entry, id: crypto.randomUUID?.() || Date.now() }, ...prev]);
  };

  const addCoins = (amount, reason) => {
    setCoins((c) => c + amount);
    addHistory({ type: "earn", reason, amount, ts: Date.now() });
  };

  const spendCoins = (amount, reason) => {
    if (coins < amount) {
      alert("Not enough coins!");
      return false;
    }
    setCoins((c) => c - amount);
    addHistory({ type: "spend", reason, amount, ts: Date.now() });
    return true;
  };

  const totals = useMemo(() => {
    let earned = 0, spent = 0;
    for (const h of history) {
      if (h.type === "earn") earned += Number(h.amount) || 0;
      if (h.type === "spend") spent += Number(h.amount) || 0;
    }
    return { earned, spent };
  }, [history]);

  // ===== Challenge System =====
  const {
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
  } = useChallenges(selectedTrack, addCoins, addHistory);

  // ===== App Management & Session System =====
  const {
    gameApps,
    musicApps,
    pApps,
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
    stopSession,
    remaining,
    askCoinsAndStart,
    startFromModal,
    hasElectron,
  } = useAppManagement(addHistory, spendCoins, now);

  // ===== Effects: Clock Ticker =====
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ===== Effects: Persistence =====
  useEffect(() => localStorage.setItem("coins", String(coins)), [coins]);
  useEffect(() => writeLS("history", history), [history]);

  useEffect(() => {
    if (selectedTrack) {
      localStorage.setItem("selectedTrack", selectedTrack);
    }
  }, [selectedTrack]);

  // API Key state for UI interaction
  const [apiKey, setApiKeyState] = useState(() => getApiKey());

  // ===== Track Selection =====
  const selectTrack = (trackId) => {
    setSelectedTrack(trackId);
    setShowOnboarding(false);
    addHistory({
      type: "info",
      reason: `Selected track: ${CAREER_TRACKS[trackId].name}`,
      amount: 0,
      ts: Date.now(),
    });
  };

  // ===== Earn Coins (remaining from App.js after moving challenge logic) =====
  const earnLeetCode = (difficulty, helpUsed) => {
    const base = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
    const amount = helpUsed ? base / 2 : base;
    addCoins(amount, `LeetCode ${difficulty}${helpUsed ? " (help)" : ""}`);
  };

  const earnHackathon = () => {
    const hoursStr = prompt("How many hours did you work? (1 coin per hour)");
    const hours = Number(hoursStr || "0");
    if (hours > 0) addCoins(hours, `Hackathon/Self-study: ${hours}h`);
  };

  return (
    <div className="App">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="onboarding-backdrop">
          <div className="onboarding-modal">
            <h1>Welcome to Nomor! 🎯</h1>
            <p>Choose your career track to get personalized challenges and motivation</p>

            <div className="tracks-grid">
              {Object.values(CAREER_TRACKS).map((track) => (
                <div
                  key={track.id}
                  className="track-card"
                  onClick={() => selectTrack(track.id)}
                >
                  <div className="track-icon">{track.icon}</div>
                  <h3>{track.name}</h3>
                  <p className="track-desc">{track.description}</p>
                  <div className="track-skills">
                    {track.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="app-bar">
        <h1>Nomor</h1>
        <div className="clock">Current Time: {now.toLocaleTimeString()}</div>
      </header>

      <section className="stats">
        <div className="stat">
          <div className="label">Coins</div>
          <div className="value">{coins.toFixed(1)}</div>
        </div>
        <div className="stat">
          <div className="label">Total Earned</div>
          <div className="value">+{totals.earned.toFixed(1)}</div>
        </div>
        <div className="stat">
          <div className="label">Total Spent</div>
          <div className="value">-{totals.spent.toFixed(1)}</div>
        </div>
        <div className="stat">
          <div className="label">Your Track</div>
          <div className="value" style={{ fontSize: '16px' }}>
            {selectedTrack ? (
              <>
                {CAREER_TRACKS[selectedTrack].icon} {CAREER_TRACKS[selectedTrack].name}
              </>
            ) : (
              'Not Set'
            )}
          </div>
        </div>
        <div className="stat">
          <div className="label">Electron</div>
          <div className={`value ${hasElectron ? "ok" : "warn"}`}>
            {hasElectron ? "Detected" : "Browser-only"}
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="card">
        <div className="apps-header">
          <h2>Settings</h2>
          <button
            className="outline"
            onClick={() => setShowOnboarding(true)}
          >
            Change Track
          </button>
        </div>

        {selectedTrack && (
          <div className="track-info">
            <div className="track-info-header">
              <span className="track-icon-large">{CAREER_TRACKS[selectedTrack].icon}</span>
              <div>
                <h3>{CAREER_TRACKS[selectedTrack].name}</h3>
                <p className="muted">{CAREER_TRACKS[selectedTrack].description}</p>
              </div>
            </div>
            <div className="track-skills-list">
              <strong>Key Skills:</strong>
              <div className="track-skills">
                {CAREER_TRACKS[selectedTrack].skills.map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
            <div className="track-achievers">
              <strong>Learn from:</strong> {CAREER_TRACKS[selectedTrack].achievers.join(', ')}
            </div>
          </div>
        )}
      </section>

      {/* Motivation Section */}
      <section className="card motivation-card">
        <div className="apps-header">
          <h2>💪 Daily Motivation</h2>
          <button
            className="outline tiny"
            onClick={fetchMotivation}
            disabled={motivationLoading}
          >
            {motivationLoading ? "Loading..." : "🔄 Refresh"}
          </button>
        </div>

        {motivationLoading ? (
          <div className="motivation-loading">
            <div className="loading-spinner"></div>
            <p>Generating your personalized motivation...</p>
          </div>
        ) : motivationQuote ? (
          <div className="motivation-content">
            <div className="quote-icon">✨</div>
            <blockquote className="motivation-quote">
              {motivationQuote}
            </blockquote>
            {selectedTrack && (
              <div className="motivation-footer">
                <span className="track-badge">
                  {CAREER_TRACKS[selectedTrack].icon} {CAREER_TRACKS[selectedTrack].name}
                </span>
                <span className="muted small">
                  Generated on {new Date(lastMotivationDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="motivation-empty">
            <p className="muted">Click refresh to get your daily motivation!</p>
          </div>
        )}
      </section>

      {/* Daily Challenges */}
      <section className="card">
        <h2>🎯 Daily Challenges</h2>
        <div className="muted small" style={{ marginBottom: '16px' }}>
          Resets in: {getTimeUntilMidnight()}
        </div>

        <div className="challenge-grid">

          {/* DSA Challenge Card */}
          <div className="challenge-card">
            <div className="challenge-header">
              <div>
                <h3>💻 DSA Challenge</h3>
                <p className="muted small">Solve 1 LeetCode problem</p>
              </div>
              <div className="streak-badge">
                🔥 {dsaStreak} day{dsaStreak !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="challenge-reward">
              <span className="coin-reward">🪙 2 coins</span>
            </div>

            {dsaCompleted ? (
              <div className="challenge-completed">
                <div className="checkmark">✓</div>
                <span>Completed Today!</span>
              </div>
            ) : (
              <button onClick={completeDsaChallenge}>
                Mark as Complete
              </button>
            )}
          </div>

          {/* MCQ Challenge Card */}
          <div className="challenge-card">
            <div className="challenge-header">
              <div>
                <h3>📚 MCQ Challenge</h3>
                <p className="muted small">Answer 15 track-specific questions</p>
              </div>
              <div className="streak-badge">
                🔥 {mcqStreak} day{mcqStreak !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="challenge-reward">
              <span className="coin-reward">🪙 Up to 3 coins</span>
            </div>

            {mcqQuestions.length === 0 ? (
              <div>
                {loadingMcq ? (
                  <div className="challenge-loading">
                    <div className="loading-spinner-small"></div>
                    <span>Generating questions...</span>
                  </div>
                ) : (
                  <button onClick={generateMcqQuestions}>
                    Generate Questions
                  </button>
                )}
              </div>
            ) : (
              <div className="mcq-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(mcqCompleted / 15) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {mcqCompleted}/15 answered
                  {mcqScore && mcqScore.total > 0 && (
                    <span className="score-badge">
                      {mcqScore.percentage}% correct
                    </span>
                  )}
                </div>
                {mcqCompleted < 15 && (
                  <button onClick={() => {
                    document.getElementById('mcq-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    Continue Quiz
                  </button>
                )}
                {mcqCompleted === 15 && (
                  <div className="challenge-completed">
                    <div className="checkmark">✓</div>
                    <span>Completed Today!</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* MCQ Questions Section */}
      {mcqQuestions.length > 0 && mcqCompleted < 15 && (
        <section className="card" id="mcq-section">
          <h2>📝 MCQ Questions</h2>
          <div className="muted small" style={{ marginBottom: '16px' }}>
            Track: {selectedTrack ? CAREER_TRACKS[selectedTrack].name : 'None'}
          </div>

          <div className="mcq-questions-list">
            {mcqQuestions.map((q, qIndex) => {
              const answered = mcqAnswers[qIndex] !== undefined;
              const userAnswer = mcqAnswers[qIndex];

              return (
                <div
                  key={qIndex}
                  className={`mcq-question-card ${answered ? 'answered' : ''}`}
                >
                  <div className="question-header">
                    <span className="question-number">Question {qIndex + 1}/15</span>
                    <span className={`difficulty-badge ${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="question-text">
                    {q.question}
                  </div>

                  <div className="options-list">
                    {q.options.map((option, optIndex) => {
                      const isSelected = answered && userAnswer.selected === optIndex;
                      const isCorrect = optIndex === q.correct;
                      const showCorrect = answered && isCorrect;
                      const showWrong = answered && isSelected && !isCorrect;

                      return (
                        <button
                          key={optIndex}
                          className={`option-button ${showCorrect ? 'correct' : ''
                            } ${showWrong ? 'wrong' : ''} ${isSelected && !answered ? 'selected' : ''
                            }`}
                          onClick={() => selectMcqAnswer(qIndex, optIndex)}
                          disabled={answered}
                        >
                          <span className="option-letter">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className="option-text">{option}</span>
                          {showCorrect && <span className="option-icon">✓</span>}
                          {showWrong && <span className="option-icon">✗</span>}
                        </button>
                      );
                    })}
                  </div>

                  {answered && (
                    <div className={`answer-feedback ${userAnswer.correct ? 'correct' : 'wrong'}`}>
                      {userAnswer.correct ? (
                        <>
                          <span className="feedback-icon">✓</span>
                          <span>Correct! +0.2 coins earned</span>
                        </>
                      ) : (
                        <>
                          <span className="feedback-icon">✗</span>
                          <span>Incorrect. The correct answer was {String.fromCharCode(65 + q.correct)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Earn Coins */}
      <section className="card">
        <h2>Earn Coins</h2>
        <div className="buttons">
          <button onClick={() => earnLeetCode("easy", true)}>LeetCode Easy (0.5, help)</button>
          <button onClick={() => earnLeetCode("easy", false)}>LeetCode Easy (1)</button>
          <button onClick={() => earnLeetCode("medium", true)}>LeetCode Medium (1, help)</button>
          <button onClick={() => earnLeetCode("medium", false)}>LeetCode Medium (2)</button>
          <button onClick={() => earnLeetCode("hard", true)}>LeetCode Hard (1.5, help)</button>
          <button onClick={() => earnLeetCode("hard", false)}>LeetCode Hard (3)</button>
          <button onClick={earnHackathon}>Hackathon / Self-study (1 coin/hour)</button>
        </div>
      </section>

      {/* Manage Apps */}
      <section className="card">
        <div className="apps-header">
          <h2>Manage Apps</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {categorizing && (
              <span className="muted small">🤖 Auto-categorizing...</span>
            )}
            {!autoCategorized && (gameApps.length > 0 || musicApps.length > 0 || pApps.length > 0) && (
              <button
                className="outline"
                onClick={() => autoCategorizeApps(false)}
                disabled={categorizing}
              >
                {categorizing ? "Categorizing..." : "🤖 Auto-Categorize Apps"}
              </button>
            )}
            {(autoCategorized || gameApps.length > 0 || musicApps.length > 0 || pApps.length > 0) && (
              <button
                className="outline"
                onClick={() => autoCategorizeApps(true)}
                disabled={categorizing}
                title="Re-categorize all apps using AI"
              >
                {categorizing ? "Categorizing..." : "🔄 Re-categorize"}
              </button>
            )}
          </div>
        </div>
        <div className="apps-grid">
          {/* Games */}
          <div className="apps-col">
            <div className="apps-header">
              <h3>Games</h3>
              <button className="outline" onClick={() => addAppToList("game")}>+ Add Game</button>
            </div>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
            >
              {gameApps.length === 0 && <option value="">No games added</option>}
              {gameApps.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ul className="apps-list">
              {gameApps.map((g) => (
                <li key={g.id}>
                  <span title={g.path}>{g.name}</span>
                  <button className="tiny danger" onClick={() => removeAppFromList("game", g.id)}>remove</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Music */}
          <div className="apps-col">
            <div className="apps-header">
              <h3>Music</h3>
              <button className="outline" onClick={() => addAppToList("music")}>+ Add Music App</button>
            </div>
            <select
              value={selectedMusicId}
              onChange={(e) => setSelectedMusicId(e.target.value)}
            >
              {musicApps.length === 0 && <option value="">No music apps added</option>}
              {musicApps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ul className="apps-list">
              {musicApps.map((m) => (
                <li key={m.id}>
                  <span title={m.path}>{m.name}</span>
                  <button className="tiny danger" onClick={() => removeAppFromList("music", m.id)}>remove</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div className="apps-col">
            <div className="apps-header">
              <h3>Social Media</h3>
              <button className="outline" onClick={() => addAppToList("p")}>+ Add App</button>
            </div>
            <select
              value={selectedPId}
              onChange={(e) => setSelectedPId(e.target.value)}
            >
              {pApps.length === 0 && <option value="">No apps added</option>}
              {pApps.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ul className="apps-list">
              {pApps.map((p) => (
                <li key={p.id}>
                  <span title={p.path}>{p.name}</span>
                  <button className="tiny danger" onClick={() => removeAppFromList("p", p.id)}>remove</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Spend Coins */}
      <section className="card">
        <h2>Spend Coins</h2>

        <div className="spend-row">
          <div className="spend-block">
            <div className="label">Play Games</div>
            <div className="sub">1 coin = 15 mins</div>
            <button onClick={() => askCoinsAndStart("game")}>Start Gameplay</button>
          </div>
          <div className="spend-block">
            <div className="label">Play Music</div>
            <div className="sub">1 coin = 30 mins</div>
            <button onClick={() => askCoinsAndStart("music")}>Start Music</button>
          </div>
          <div className="spend-block">
            <div className="label">Social Media Apps</div>
            <div className="sub">1 coin = 5 mins</div>
            <button onClick={() => askCoinsAndStart("p")}>Start Social Media Apps</button>
          </div>
        </div>

        {activeSession ? (
          <div className="active-session">
            <div>
              <strong>Active:</strong> {activeSession.category.toUpperCase()} — {activeSession.appName || "Unknown"}
            </div>
            <div>Remaining: <span className="mono">{remaining}</span></div>
            <button className="danger" onClick={() => stopSession("Manual stop")}>Stop Now</button>
          </div>
        ) : (
          <div className="muted">No active session</div>
        )}
      </section>

      {/* Weekly Schedule */}
      <section className="card">
        <h2>Weekly Schedule</h2>
        <div className="schedule">
          {schedule.map((item, i) => (
            <div key={i} className="schedule-row">
              <strong>{item.day}</strong>
              <span>{item.time}</span>
              <span>{item.class}</span>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section className="card">
        <h2>History</h2>
        <div className="history">
          {history.length === 0 && <div className="muted">No history yet</div>}
          {history.map((h) => (
            <div key={h.id} className={`hist ${h.type}`}>
              <span className="ts">{new Date(h.ts).toLocaleTimeString()}</span>
              {h.type === "earn" && <span className="plus">+{h.amount}</span>}
              {h.type === "spend" && <span className="minus">-{h.amount}</span>}
              {h.type === "info" && <span className="info"></span>}
              <span className="reason">{h.reason}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Modal for Spending Coins */}
      {modal.open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>
              Spend Coins for {modal.category.toUpperCase()}
            </h3>
            <p>1 coin = {COINS_TO_MINUTES[modal.category]} mins</p>
            <input
              type="number"
              min="1"
              value={modal.coins}
              onChange={(e) => setModal({ ...modal, coins: e.target.value })}
            />
            <div className="modal-actions">
              <button onClick={startFromModal}>Start</button>
              <button onClick={() => setModal({ open: false, category: null, coins: 1 })}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="muted small">
        Tip: In Electron, expose <code>window.electronAPI.startApp/stopApp</code> in preload.js to actually launch/close the selected exe.
      </footer>
    </div>
  );
}