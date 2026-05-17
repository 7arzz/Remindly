import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronRight, ChevronLeft, X, Sparkles, Menu, HelpCircle, BarChart3, LogOut } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   SpotlightTutorial  – Fully responsive, multi-step coach-mark onboarding.

   Props:
   - steps        : Array<{ targetId, title, description, position? }>
                    position: "top" | "bottom" | "left" | "right" (auto-fallback)
   - isActive     : boolean
   - currentStep  : number
   - totalSteps   : number
   - onNext / onPrev / onSkip : () => void
───────────────────────────────────────────────────────────────────────────── */

const PADDING = 14;       // px padding around highlighted element
const TOOLTIP_GAP = 18;   // px gap between element and tooltip
const MIN_MARGIN = 12;    // px from viewport edge

/** Mobile navigation ID remapping */
const MOBILE_ID_MAP = {
  "nav-tasks":      "mobile-nav-tasks",
  "nav-summaries":  "mobile-nav-summaries",
  "nav-roadmap":    "mobile-nav-roadmap",
};

/** Return current viewport size, using VisualViewport when available (handles iOS keyboard) */
function getViewport() {
  if (typeof window === "undefined") return { vw: 0, vh: 0 };
  const vv = window.visualViewport;
  return {
    vw: vv ? vv.width  : window.innerWidth,
    vh: vv ? vv.height : window.innerHeight,
  };
}

/** Resolve the best element ID depending on viewport width */
function resolveId(targetId) {
  return window.innerWidth < 1024 && MOBILE_ID_MAP[targetId]
    ? MOBILE_ID_MAP[targetId]
    : targetId;
}

export default function SpotlightTutorial({
  steps,
  isActive,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) {
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [transitioning, setTransitioning] = useState(false);

  const tooltipRef  = useRef(null);
  const animFrameRef = useRef(null);

  /* ── Compute spotlight & tooltip positions ── */
  const computePosition = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;

    const { targetId, position: preferredPos } = steps[currentStep];
    const finalId  = resolveId(targetId);
    const targetEl = document.getElementById(finalId);
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const { vw, vh } = getViewport();
    const isMobile = vw < 640;

    /* ── Spotlight box ── */
    const spotlight = {
      top:    rect.top    - PADDING,
      left:   rect.left   - PADDING,
      width:  rect.width  + PADDING * 2,
      height: rect.height + PADDING * 2,
      borderRadius: Math.min(18, (rect.width + rect.height) / 8),
    };
    setSpotlightRect(spotlight);

    /* ── Tooltip dimensions ── */
    // Use real measured height after first render; fall back to 190px estimate
    const tooltipEl = tooltipRef.current;
    const tooltipH  = tooltipEl ? tooltipEl.offsetHeight + 4 : 190;
    const tooltipW  = isMobile
      ? vw - MIN_MARGIN * 2            // full-width minus edge margins on mobile
      : Math.min(320, vw - MIN_MARGIN * 2);

    /* ── Mobile: always pin to bottom above mobile nav (88px) + safe area ── */
    if (isMobile) {
      const mobileNavH = 88; // mobile-nav height
      setTooltipStyle({
        left:   MIN_MARGIN,
        right:  MIN_MARGIN,
        bottom: `calc(${mobileNavH}px + env(safe-area-inset-bottom, 0px) + 8px)`,
        top:    "auto",
        width:  "auto",
        "--arrow-pos": "none",
      });
      return;
    }

    /* ── Desktop: smart placement ── */
    const maxLeft = vw - tooltipW - MIN_MARGIN;
    const maxTop  = vh - tooltipH - MIN_MARGIN;

    // Horizontal center-aligned to spotlight
    const centeredLeft = Math.max(
      MIN_MARGIN,
      Math.min(spotlight.left + spotlight.width / 2 - tooltipW / 2, maxLeft)
    );
    // Vertical center-aligned to spotlight
    const centeredTop = Math.max(
      MIN_MARGIN,
      Math.min(spotlight.top + spotlight.height / 2 - tooltipH / 2, maxTop)
    );

    const positions = {
      bottom: {
        top:  spotlight.top + spotlight.height + TOOLTIP_GAP,
        left: centeredLeft,
      },
      top: {
        top:  spotlight.top - tooltipH - TOOLTIP_GAP,
        left: centeredLeft,
      },
      right: {
        top:  centeredTop,
        left: spotlight.left + spotlight.width + TOOLTIP_GAP,
      },
      left: {
        top:  centeredTop,
        left: spotlight.left - tooltipW - TOOLTIP_GAP,
      },
    };

    const fitsIn = (p) =>
      p.top  >= MIN_MARGIN &&
      p.top  + tooltipH <= vh - MIN_MARGIN &&
      p.left >= MIN_MARGIN &&
      p.left + tooltipW <= vw - MIN_MARGIN;

    const choose = () => {
      if (preferredPos && positions[preferredPos] && fitsIn(positions[preferredPos])) {
        return preferredPos;
      }
      const order = ["bottom", "top", "right", "left"];
      return order.find((k) => fitsIn(positions[k])) ?? "bottom";
    };

    const chosen = choose();
    const pos = positions[chosen];

    // Clamp to viewport
    const clampedTop  = Math.max(MIN_MARGIN, Math.min(pos.top,  maxTop));
    const clampedLeft = Math.max(MIN_MARGIN, Math.min(pos.left, maxLeft));

    setTooltipStyle({
      top:   clampedTop,
      left:  clampedLeft,
      width: tooltipW,
      "--arrow-pos": chosen,
    });
  }, [isActive, currentStep, steps]);

  /* ── Scroll target into view & recompute ── */
  useEffect(() => {
    if (!isActive) return;
    const step = steps[currentStep];
    if (!step) return;

    const el = document.getElementById(resolveId(step.targetId));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }

    // Allow scroll + DOM repaint to settle before measuring
    const t1 = setTimeout(computePosition, 120);
    const t2 = setTimeout(computePosition, 350); // second pass for accuracy
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isActive, currentStep, steps, computePosition]);

  /* ── Recompute on resize / scroll / visualViewport change ── */
  useEffect(() => {
    if (!isActive) return;

    const schedule = () => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(computePosition);
    };

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    // VisualViewport handles mobile keyboard open/close
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", schedule);
      vv.addEventListener("scroll", schedule);
    }

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (vv) {
        vv.removeEventListener("resize", schedule);
        vv.removeEventListener("scroll", schedule);
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, computePosition]);

  /* ── Re-measure once tooltip renders (gets real height) ── */
  useEffect(() => {
    if (!isActive || !spotlightRect) return;
    // One more pass after tooltip is in DOM with content
    const t = setTimeout(computePosition, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, spotlightRect]);

  /* ── Step transition ── */
  const handleNext = () => {
    setTransitioning(true);
    setTimeout(() => { onNext(); setTransitioning(false); }, 220);
  };
  const handlePrev = () => {
    setTransitioning(true);
    setTimeout(() => { onPrev(); setTransitioning(false); }, 220);
  };

  if (!isActive || !spotlightRect) return null;

  const step    = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast  = currentStep === totalSteps - 1;

  /* ── SVG mask: full-screen rect with rounded-rect cutout ── */
  const { top, left, width, height, borderRadius: br } = spotlightRect;
  const { vw: W, vh: H } = getViewport();
  const rx = br;

  // Outer rect CCW + inner rounded-rect CW → evenodd creates a "hole"
  const maskPath = [
    `M 0 0 H ${W} V ${H} H 0 Z`,
    `M ${left + rx} ${top}`,
    `H ${left + width - rx}`,
    `Q ${left + width} ${top}   ${left + width} ${top + rx}`,
    `V ${top + height - rx}`,
    `Q ${left + width} ${top + height} ${left + width - rx} ${top + height}`,
    `H ${left + rx}`,
    `Q ${left} ${top + height} ${left} ${top + height - rx}`,
    `V ${top + rx}`,
    `Q ${left} ${top}   ${left + rx} ${top}`,
    `Z`,
  ].join(" ");

  return (
    <>
      {/* ── Dark overlay with SVG spotlight cutout ── */}
      <div className="tutorial-overlay" aria-hidden="true">
        <svg
          style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={maskPath}
            fill="rgba(2, 12, 27, 0.82)"
            fillRule="evenodd"
          />
        </svg>

        {/* Glow ring around spotlight */}
        <div
          className="tutorial-glow-ring"
          style={{
            top:    spotlightRect.top,
            left:   spotlightRect.left,
            width:  spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: spotlightRect.borderRadius,
          }}
        />
      </div>

      {/* ── Tooltip card ── */}
      <div
        ref={tooltipRef}
        className={`tutorial-tooltip${transitioning ? " tutorial-tooltip--fade" : ""}`}
        style={tooltipStyle}
        role="dialog"
        aria-label={`Tutorial step ${currentStep + 1} of ${totalSteps}`}
        aria-live="polite"
      >
        {/* ── Header: Desktop = badge + close | Mobile = hamburger hint ── */}
        {window.innerWidth >= 640 ? (
          <div className="tutorial-tooltip__header">
            <div className="tutorial-tooltip__badge">
              <Sparkles size={12} />
              <span>Guided Tour</span>
            </div>
            <button
              id="tutorial-skip-btn"
              className="tutorial-tooltip__close"
              onClick={onSkip}
              aria-label="Skip tutorial"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="tutorial-tooltip__header">
            {/* Hamburger menu hint strip */}
            <div className="tutorial-hamburger-hint">
              <div className="tutorial-hamburger-hint__label">
                <Menu size={13} />
                <span>Ketuk ☰ untuk akses:</span>
              </div>
              <div className="tutorial-hamburger-hint__items">
                <span><HelpCircle size={11} /> Guided Tour</span>
                <span><BarChart3 size={11} /> Analytics</span>
                <span><LogOut size={11} /> Sign Out</span>
              </div>
            </div>
            <button
              id="tutorial-skip-btn"
              className="tutorial-tooltip__close tutorial-tooltip__close--sm"
              onClick={onSkip}
              aria-label="Skip tutorial"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className={`tutorial-tooltip__content ${
            transitioning ? "tutorial-content--out" : "tutorial-content--in"
          }`}
        >
          <h3 className="tutorial-tooltip__title">{step.title}</h3>
          <p className="tutorial-tooltip__desc">{step.description}</p>
        </div>

        {/* Footer */}
        <div className="tutorial-tooltip__footer">
          {/* Progress dots */}
          <div className="tutorial-progress" aria-label={`Step ${currentStep + 1} of ${totalSteps}`}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`tutorial-dot${
                  i === currentStep
                    ? " tutorial-dot--active"
                    : i < currentStep
                    ? " tutorial-dot--done"
                    : ""
                }`}
              />
            ))}
            <span className="tutorial-progress__label">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>

          {/* Navigation */}
          <div className="tutorial-nav">
            {!isFirst && (
              <button
                id="tutorial-prev-btn"
                className="tutorial-btn tutorial-btn--ghost"
                onClick={handlePrev}
                aria-label="Previous step"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <button
              id="tutorial-next-btn"
              className="tutorial-btn tutorial-btn--primary"
              onClick={handleNext}
              aria-label={isLast ? "Finish tutorial" : "Next step"}
            >
              {isLast ? "🎉 Let's Go!" : "Next"}
              {!isLast && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
