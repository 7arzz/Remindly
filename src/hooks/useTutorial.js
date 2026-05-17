import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "remindly_tutorial_done";

/**
 * useTutorial – manages the spotlight tutorial lifecycle.
 *
 * @returns {{
 *   isActive: boolean,
 *   currentStep: number,
 *   totalSteps: number,
 *   goNext: () => void,
 *   goPrev: () => void,
 *   skip: () => void,
 *   restart: () => void,
 * }}
 */
export function useTutorial(steps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Show tutorial only on first visit
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so layout elements are rendered first
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => {
      if (s < steps.length - 1) return s + 1;
      finish();
      return s;
    });
  }, [steps.length, finish]);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => (s > 0 ? s - 1 : s));
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const restart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  return {
    isActive,
    currentStep,
    totalSteps: steps.length,
    goNext,
    goPrev,
    skip,
    restart,
  };
}
