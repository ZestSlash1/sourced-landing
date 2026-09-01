"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, type Variants } from "framer-motion";

export interface ProofBarNearMiss {
  clusterKey: string;
  theme: string;
  signalCount: number;
  platformCount: number;
  platforms: string[];
}

export interface ProofBarData {
  signalsTracked: number;
  clustersEvaluated: number;
  clustersPassedThisRun: number;
  minClusterSize: number;
  nearMiss: ProofBarNearMiss[];
}

const PLATFORMS: { key: string; label: string }[] = [
  { key: "hackernews", label: "HN" },
  { key: "stackexchange", label: "SE" },
  { key: "github", label: "GitHub" },
  { key: "devto", label: "Dev.to" },
  { key: "lobsters", label: "Lobsters" },
];

const CYCLE_MS = 3400;
const SPRING = { type: "spring", stiffness: 240, damping: 28 } as const;

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

/** Ticks up to `value` with spring physics once it scrolls into view; jumps straight there under reduced motion. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 200, damping: 30 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    spring.set(value);
  }, [isInView, value, reduceMotion, spring]);

  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

export default function ProofBar({ data }: { data: ProofBarData }) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [activeIndex, setActiveIndex] = useState(0);

  const nearMiss = data.nearMiss;
  const active = nearMiss[activeIndex] ?? null;

  useEffect(() => {
    if (!isInView || reduceMotion || nearMiss.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % nearMiss.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [isInView, reduceMotion, nearMiss.length]);

  const progress = useMotionValue(0);
  const springProgress = useSpring(progress, { stiffness: 220, damping: 28 });
  const fraction = active ? Math.min(active.signalCount / data.minClusterSize, 1) : 0;

  useEffect(() => {
    if (!isInView) return;
    progress.set(fraction);
  }, [isInView, fraction, progress]);

  return (
    <motion.section
      ref={sectionRef}
      className="proof-bar"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
    >
      <div className="wrap">
        <motion.div variants={itemVariants} className="proof-bar-head">
          <div className="eyebrow">Live from the pipeline</div>
          <h2>Live bar, not a screenshot</h2>
          <p className="section-sub">
            A cluster only becomes a build brief once it clears {data.minClusterSize}+ independent signals. This is
            what&apos;s in the pipeline right now.
          </p>
        </motion.div>

        <div className="proof-stats">
          <motion.div variants={itemVariants} className="stat-tile">
            <div className="stat-value mono">
              <CountUp value={data.signalsTracked} />
            </div>
            <div className="stat-label">Signals tracked</div>
          </motion.div>
          <motion.div variants={itemVariants} className="stat-tile">
            <div className="stat-value mono">
              <CountUp value={data.clustersEvaluated} />
            </div>
            <div className="stat-label">Clusters evaluated</div>
          </motion.div>
          <motion.div variants={itemVariants} className="stat-tile">
            <div className="stat-value mono accent">
              <CountUp value={data.clustersPassedThisRun} />
            </div>
            <div className="stat-label">Passed the bar, this run</div>
          </motion.div>
        </div>

        {active ? (
          <motion.div variants={itemVariants} className="proof-track-card">
            <div className="proof-track-head">
              <span className="proof-track-theme mono">{active.theme}</span>
              <span className="proof-track-count mono">
                {active.signalCount} / {data.minClusterSize} signals
              </span>
            </div>

            <div className="proof-track">
              <motion.div
                className="proof-track-fill"
                style={{ scaleX: reduceMotion ? fraction : springProgress, transformOrigin: "left" }}
              />
            </div>

            <motion.div
              key={active.clusterKey}
              className="proof-chip-row"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {PLATFORMS.map((p) => {
                const hit = active.platforms.includes(p.key);
                return (
                  <motion.span
                    key={p.key}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03 }}
                    className={`proof-chip mono ${hit ? "is-hit" : ""}`}
                  >
                    {p.label}
                  </motion.span>
                );
              })}
            </motion.div>

            <p className="proof-track-note">
              {active.platformCount >= 2
                ? "Already cross-platform. That counts as stronger evidence, though it isn't required to clear the bar."
                : "Needs more independent signals to clear the bar. Cross-platform spread would count as stronger evidence, but isn't required."}
            </p>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="proof-track-card proof-track-empty">
            <p>Every cluster currently in the pipeline has already cleared the bar. Nothing left waiting.</p>
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <Link href="/methodology" className="proof-cta">
            See the full live methodology →
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}
