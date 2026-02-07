"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomeContent } from "@/components/HomeContent";
import { ApplicationForm } from "@/components/apply-form/ApplicationForm";

export default function Home() {
  const pathname = usePathname();
  const isApplyPage = pathname === "/apply" || pathname === "/application";

  return (
    <>
      <Header />
      {isApplyPage ? <ApplicationForm /> : <HomeContent />}
      <Footer />
    </>
  );
}
