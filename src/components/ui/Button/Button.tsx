"use client";

import React from "react";
import styles from "./button.module.css";

type ButtonVariant =
  | "primary"
  | "outline"
  | "ghost"
  | "success";

type ButtonSize =
  | "sm"
  | "md"
  | "lg";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;

  variant?: ButtonVariant;

  size?: ButtonSize;

  fullWidth?: boolean;

  leftIcon?: React.ReactNode;

  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        ${styles.button}
        ${styles[variant]}
        ${styles[size]}
        ${fullWidth ? styles.fullWidth : ""}
        ${className}
      `}
      {...props}
    >
      {leftIcon && (
        <span className={styles.icon}>
          {leftIcon}
        </span>
      )}

      <span>{children}</span>

      {rightIcon && (
        <span className={styles.icon}>
          {rightIcon}
        </span>
      )}
    </button>
  );
}