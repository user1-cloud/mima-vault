"use client";
import { IconButton } from "./icon-button";
import type { HTMLMotionProps } from "motion/react";

export function DangerIconButton(props: HTMLMotionProps<"button">) {
  return <IconButton variant="destructive" {...props} />;
}
