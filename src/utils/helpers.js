export const calculateProgress = (steps) => {
  if (!steps || steps.length === 0) return 0;
  const completedSteps = steps.filter(step => step.done).length;
  return Math.round((completedSteps / steps.length) * 100);
};
