import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { WhatWeDo } from "@/components/WhatWeDo";
import { HowItWorks } from "@/components/HowItWorks";
import { RewardProgram } from "@/components/RewardProgram";
import { FundingOptions } from "@/components/FundingOptions";
import { WhyChoose } from "@/components/WhyChoose";
import { UseYourCapital } from "@/components/UseYourCapital";
import { OurApproach } from "@/components/OurApproach";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhatWeDo />
        <HowItWorks />
        <RewardProgram />
        <FundingOptions />
        <WhyChoose />
        <UseYourCapital />
        <OurApproach />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
