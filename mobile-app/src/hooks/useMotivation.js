import { useState, useEffect, useCallback } from 'react';
import { readLS, writeLS } from '../utils/localStorageHelpers';
import { callLLM } from '../api/llmService';
import { CAREER_TRACKS } from '../config/appConstants';

export const useMotivation = (selectedTrack) => {
  const getStorageKey = useCallback((key) => {
    if (!selectedTrack) return key;
    return `${key}_${selectedTrack}`;
  }, [selectedTrack]);

  const [motivationQuote, setMotivationQuote] = useState(() =>
    readLS(selectedTrack ? `motivationQuote_${selectedTrack}` : "motivationQuote", null)
  );
  const [motivationLoading, setMotivationLoading] = useState(false);

  // Initialize with track-specific date if possible
  const [lastMotivationDate, setLastMotivationDate] = useState(() =>
    localStorage.getItem(selectedTrack ? `lastMotivationDate_${selectedTrack}` : "lastMotivationDate") || null
  );

  // Reload state when track switches
  useEffect(() => {
    if (!selectedTrack) return;
    const k = (suffix) => `${suffix}_${selectedTrack}`;

    setMotivationQuote(readLS(k("motivationQuote"), null));
    setLastMotivationDate(localStorage.getItem(k("lastMotivationDate")) || null);
  }, [selectedTrack]);

  // Persist State
  useEffect(() => {
    if (selectedTrack && lastMotivationDate) {
      localStorage.setItem(getStorageKey("lastMotivationDate"), lastMotivationDate);
    }
  }, [lastMotivationDate, getStorageKey, selectedTrack]);

  useEffect(() => {
    if (selectedTrack) {
      writeLS(getStorageKey("motivationQuote"), motivationQuote);
    }
  }, [motivationQuote, getStorageKey, selectedTrack]);

  const fetchMotivation = async () => {
    if (!selectedTrack) {
      // alert("Please select your career track first!"); // Handled by App.js
      return;
    }

    setMotivationLoading(true);

    try {
      const track = CAREER_TRACKS[selectedTrack];

      const prompt = `You are a motivational coach for aspiring ${track.name}s. Generate a single powerful, personalized motivational quote for someone pursuing a career as a ${track.name}. 
      
Context:
- Career: ${track.name}
- Key skills they're building: ${track.skills.join(", ")}
- Inspirational figures in their field: ${track.achievers.join(", ")}

Generate ONE motivational quote (2-3 sentences max) that:
1. Is specific to ${track.name} career path
2. Encourages consistent learning and practice
3. Relates to their key skills or the journey ahead
4. Is inspiring but realistic

Return ONLY the quote, nothing else. No quotation marks, no preamble.`;

      const quote = await callLLM(prompt);
      setMotivationQuote(quote);
      setLastMotivationDate(new Date().toDateString());

    } catch (error) {
      console.error("Error fetching motivation:", error);
      const track = CAREER_TRACKS[selectedTrack];
      setMotivationQuote(`Every expert ${track.name} was once a beginner. Keep learning, keep building, and trust the process. Your consistent effort today shapes your expertise tomorrow.`);
      setLastMotivationDate(new Date().toDateString());
    } finally {
      setMotivationLoading(false);
    }
  };

  // Fetch motivation daily if selectedTrack is set and not already fetched today
  useEffect(() => {
    const today = new Date().toDateString();
    // Check against current state `lastMotivationDate` which should be loaded for this track
    if (selectedTrack && lastMotivationDate !== today) {
      fetchMotivation();
    }
  }, [selectedTrack, lastMotivationDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return { motivationQuote, motivationLoading, lastMotivationDate, fetchMotivation };
};
