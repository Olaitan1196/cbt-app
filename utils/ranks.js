// This file handles everything related to student ranks.
// Both the Dashboard and Performance screen import from here.
// This way the rank logic is written once and used everywhere.

export const RANKS = [
  {
    name: 'Poor',
    minScore: 0,
    maxScore: 29,
    icon: '😔',
    color: '#ef5350',
    message: null,
  },
  {
    name: 'Good',
    minScore: 30,
    maxScore: 49,
    icon: '🙂',
    color: '#ff9800',
    message: null,
  },
  {
    name: 'Excellent',
    minScore: 50,
    maxScore: 69,
    icon: '😊',
    color: '#29b6f6',
    message: null,
  },
  {
    name: 'Scholar',
    minScore: 70,
    maxScore: 84,
    icon: '🎓',
    color: '#66bb6a',
    message: (name) =>
      `Welcome back, ${name}! 🎓 You have reached Scholar rank. Your dedication is truly paying off. Keep pushing forward!`,
  },
  {
    name: 'Guru',
    minScore: 85,
    maxScore: 100,
    icon: '🏆',
    color: '#ffd700',
    message: (name) =>
      `Welcome back, ${name}! 🏆 You are a Guru! You are among the best. Your consistency and hard work are exceptional. Keep dominating!`,
  },
];

// Pass in a percentage score and get back the full rank object
export const getRank = (score) => {
  const rank = RANKS.find(
    (r) => score >= r.minScore && score <= r.maxScore
  );
  return rank || RANKS[0];
};