"use client";
import React from "react";
import { StatefulButton } from "./stateful-button";

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  size?: "default" | "sm";
}

export const PrimaryButton = ({
  className,
  children,
  size,
  ...props
}: PrimaryButtonProps) => (
  <StatefulButton className={className} size={size} {...props}>
    {children}
  </StatefulButton>
);
