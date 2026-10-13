"use client";

// Adapted from ObsidianUI's Split Showcase. See LICENSE in this directory.
// Uses Sourced's existing Motion dependency and CSS instead of Tailwind.
import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

interface ShowcaseItem {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
  visual: ReactNode;
}

export function SplitShowcase({ items }: { items: [ShowcaseItem, ShowcaseItem] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const activeIndex = hoveredIndex ?? focusedIndex;

  return (
    <div className="obsidian-split" data-active={activeIndex !== null}>
      {items.map((item, index) => (
        <motion.article
          key={item.eyebrow}
          className="obsidian-split-card"
          data-active={activeIndex === index}
          animate={{ x: !reduceMotion && activeIndex === index ? (index === 0 ? -8 : 8) : 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 24 }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
        >
          <span className="eyebrow">{item.eyebrow}</span>
          <div className="split-visual" aria-hidden="true">{item.visual}</div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <Link href={item.href}>{item.action}<span aria-hidden="true">↗</span></Link>
        </motion.article>
      ))}
    </div>
  );
}
