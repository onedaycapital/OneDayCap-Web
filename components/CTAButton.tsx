"use client";

import Link from "next/link";
import { ButtonHTMLAttributes, useState } from "react";

type BaseProps = {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showArrowOnHover?: boolean;
  openInNewTab?: boolean;
  children: React.ReactNode;
};

type CTAButtonProps = BaseProps &
  (
    | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
    | (Omit<ButtonHTMLAttributes<HTMLButtonElement>, "href"> & { href: string })
  );

const variants = {
  primary:
    "bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-cyan)] text-white hover:shadow-glow active:scale-[0.98] shadow-soft hover:shadow-glow-lg hover:translate-x-0.5 border-0",
  secondary:
    "bg-[var(--brand-black)] text-white hover:bg-slate-800 active:scale-[0.98] shadow-soft",
  outline:
    "border-2 border-[var(--brand-blue)] text-[var(--brand-blue)] bg-transparent hover:bg-[var(--brand-blue)]/5 active:scale-[0.98]",
  ghost:
    "text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/5 active:scale-[0.98]",
};

const sizes = {
  sm: "px-4 py-2 text-sm rounded-full gap-1.5",
  md: "px-6 py-3 text-base rounded-full gap-2",
  lg: "px-8 py-4 text-lg rounded-full gap-2.5",
};

export function CTAButton({
  variant = "primary",
  size = "md",
  showArrowOnHover = false,
  openInNewTab = false,
  children,
  className = "",
  href,
  disabled,
  ...props
}: CTAButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const baseClass = `
    inline-flex items-center justify-center font-semibold transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-x-0
    ${variants[variant]} ${sizes[size]} ${className}
    ${isPressed ? "scale-[0.98]" : ""}
  `;

  const content = (
    <>
      {children}
      {showArrowOnHover && (
        <span
          className="inline-block overflow-hidden transition-all duration-300 ease-out"
          style={{
            width: isHovered ? "1.25em" : 0,
            opacity: isHovered ? 1 : 0,
            marginLeft: isHovered ? "0.25em" : 0,
          }}
          aria-hidden
        >
          →
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={baseClass}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => {
          setIsPressed(false);
          setIsHovered(false);
        }}
        onMouseEnter={() => setIsHovered(true)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={baseClass}
      disabled={disabled}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => {
        setIsPressed(false);
        setIsHovered(false);
      }}
      onMouseEnter={() => setIsHovered(true)}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
