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
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  }, [currentStep, steps.length, finish]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

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
