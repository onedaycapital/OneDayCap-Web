import { Hero } from "@/components/Hero";
import { WhatWeDo } from "@/components/WhatWeDo";
import { HowItWorks } from "@/components/HowItWorks";
import { RewardProgram } from "@/components/RewardProgram";
import { FundingOptions } from "@/components/FundingOptions";
import { WhyChoose } from "@/components/WhyChoose";
import { UseYourCapital } from "@/components/UseYourCapital";
import { OurApproach } from "@/components/OurApproach";
import { FinalCTA } from "@/components/FinalCTA";

export function HomeContent() {
  return (
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
  );
}
