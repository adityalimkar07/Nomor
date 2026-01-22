export const readLS = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
