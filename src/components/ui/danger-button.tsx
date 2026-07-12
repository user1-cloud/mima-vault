"use client";
import React from "react";
import { StatefulButton } from "./stateful-button";

interface DangerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  size?: "default" | "sm";
}

export const DangerButton = ({
  className,
  children,
  size,
  ...props
}: DangerButtonProps) => (
  <StatefulButton variant="destructive" className={className} size={size} {...props}>
    {children}
  </StatefulButton>
);
