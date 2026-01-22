// ===== Career Tracks Data =====
export const CAREER_TRACKS = {
  ds: {
    id: 'ds',
    name: 'Data Scientist',
    description: 'Master statistics, ML algorithms, and data storytelling',
    icon: '📊',
    skills: ['Statistics', 'Python', 'ML', 'Data Visualization', 'SQL'],
    achievers: ['Andrew Ng', 'Cassie Kozyrkov', 'Hilary Mason']
  },
  de: {
    id: 'de',
    name: 'Data Engineer',
    description: 'Build robust data pipelines and infrastructure',
    icon: '🔧',
    skills: ['ETL', 'SQL', 'Python', 'Spark', 'Cloud Platforms'],
    achievers: ['Maxime Beauchemin', 'Jay Kreps', 'Martin Kleppmann']
  },
  swe: {
    id: 'swe',
    name: 'Software Engineer',
    description: 'Create scalable applications and systems',
    icon: '💻',
    skills: ['DSA', 'System Design', 'APIs', 'Databases', 'Testing'],
    achievers: ['Linus Torvalds', 'Guido van Rossum', 'John Carmack']
  },
  mle: {
    id: 'mle',
    name: 'Machine Learning Engineer',
    description: 'Deploy ML models to production at scale',
    icon: '🤖',
    skills: ['ML Ops', 'Model Deployment', 'Python', 'Docker', 'Kubernetes'],
    achievers: ['Chip Huyen', 'Jeremy Howard', 'Rachel Thomas']
  },
  dle: {
    id: 'dle',
    name: 'Deep Learning Engineer',
    description: 'Build and train neural networks for complex problems',
    icon: '🧠',
    skills: ['Neural Networks', 'PyTorch/TensorFlow', 'GPUs', 'Research Papers'],
    achievers: ['Andrej Karpathy', 'Ian Goodfellow', 'Yann LeCun']
  },
  cve: {
    id: 'cve',
    name: 'Computer Vision Engineer',
    description: 'Teach machines to see and understand images',
    icon: '👁️',
    skills: ['CNNs', 'Image Processing', 'OpenCV', 'Object Detection', 'Segmentation'],
    achievers: ['Fei-Fei Li', 'Kaiming He', 'Ross Girshick']
  }
};

// ===== Weekly Schedule =====
export const schedule = [
  { day: "Monday", time: "11:00 - 12:00", class: "CML102" },
  { day: "Monday", time: "17:00 - 18:30", class: "PYL749" },
  { day: "Tuesday", time: "08:00 - 09:00", class: "PYL209" },
  { day: "Tuesday", time: "17:00 - 18:00", class: "PYL759" },
  { day: "Wednesday", time: "08:00 - 09:00", class: "PYL209" },
  { day: "Wednesday", time: "11:00 - 12:00", class: "CML102" },
  { day: "Wednesday", time: "12:00 - 13:00", class: "PYL759" },
  { day: "Thursday", time: "12:00 - 13:00", class: "CML102" },
  { day: "Thursday", time: "17:00 - 18:30", class: "PYL749" },
  { day: "Friday", time: "08:00 - 09:00", class: "PYL209" },
  { day: "Friday", time: "17:00 - 18:00", class: "PYL759" },
];

// ===== Coin Conversion Rates =====
export const COINS_TO_MINUTES = {
  game: 15,
  music: 30,
  p: 5,
};
