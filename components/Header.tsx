"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CTAButton } from "./CTAButton";

const SCROLL_THRESHOLD = 100;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const hideApplyCta = pathname === "/apply" || pathname === "/application" || pathname === "/processing-application";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 transition-all duration-300 ease-out ${
        scrolled
          ? "py-2 md:py-3 bg-white/90 backdrop-blur-md shadow-soft border-b border-slate-100/80"
          : "py-3 md:py-5 bg-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
        <Image
          src={scrolled ? "/images/logo-one.png" : "/images/logo-big-white.png"}
          alt="OneDay Capital"
          width={scrolled ? 100 : 220}
          height={scrolled ? 32 : 56}
          className={`h-auto object-contain transition-all duration-300 ${scrolled ? "w-14 md:w-[100px]" : "w-20 md:w-[220px]"}`}
          priority
        />
      </Link>
      {!hideApplyCta && (
        <div className={`shrink-0 ${scrolled ? "scale-105" : ""}`}>
          <CTAButton
            href="/application"
            variant="primary"
            size={scrolled ? "md" : "lg"}
            showArrowOnHover
            className="!px-3 !py-2 !text-xs md:!px-6 md:!py-3 md:!text-base lg:!px-8 lg:!py-4 lg:!text-lg"
          >
            Apply Now
          </CTAButton>
        </div>
      )}
    </header>
  );
}
