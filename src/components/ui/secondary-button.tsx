"use client";
import React from "react";
import { StatefulButton } from "./stateful-button";

interface SecondaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  size?: "default" | "sm";
}

export const SecondaryButton = ({
  className,
  children,
  size,
  ...props
}: SecondaryButtonProps) => (
  <StatefulButton variant="secondary" className={className} size={size} {...props}>
    {children}
  </StatefulButton>
);
