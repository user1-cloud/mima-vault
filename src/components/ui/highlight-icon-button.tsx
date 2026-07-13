"use client";
import { IconButton } from "./icon-button";
import type { HTMLMotionProps } from "motion/react";

export function HighlightIconButton(props: HTMLMotionProps<"button">) {
  return <IconButton variant="default" {...props} />;
}
