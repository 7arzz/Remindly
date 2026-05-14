export const initialTemplates = [
  {
    id: "template-1",
    title: "Learn React & Modern Frontend",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    steps: [
      { id: "s1", text: "JavaScript Fundamentals", done: true },
      { id: "s2", text: "React Basics & JSX", done: true },
      { id: "s3", text: "Hooks & State", done: false },
      { id: "s4", text: "Routing & Data Fetching", done: false },
      { id: "s5", text: "Deploy a Project", done: false },
    ],
  },
  {
    id: "template-2",
    title: "Land a Dev Job",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    steps: [
      { id: "s6", text: "Polish GitHub Profile", done: true },
      { id: "s7", text: "Build Portfolio Site", done: false },
      { id: "s8", text: "Apply to 20 Roles", done: false },
      { id: "s9", text: "Nail Interviews", done: false },
    ],
  },
];
