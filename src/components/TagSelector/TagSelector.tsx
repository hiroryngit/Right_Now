"use client";

import styles from "./TagSelector.module.scss";
import type { PurposeTag } from "@/types";

interface TagSelectorProps {
  selected: PurposeTag | null;
  onSelect: (tag: PurposeTag) => void;
}

const TAGS: { value: PurposeTag; label: string }[] = [
  { value: "work", label: "仕事" },
  { value: "lunch", label: "ランチ" },
  { value: "walk", label: "散歩" },
  { value: "cafe", label: "カフェ" },
  { value: "exercise", label: "運動" },
];

export function TagSelector({ selected, onSelect }: TagSelectorProps) {
  return (
    <div className={styles.tags}>
      {TAGS.map((tag) => (
        <button
          key={tag.value}
          className={`${styles.tags__item} ${
            selected === tag.value ? styles["tags__item--active"] : ""
          }`}
          onClick={() => onSelect(tag.value)}
          type="button"
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
