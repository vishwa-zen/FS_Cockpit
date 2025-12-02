import React from "react";
import { HomeSearchSection } from "./sections/HomeSearchSection";
import { IssueDetailsSection } from "./sections/IssueDetailsSection";
import { IssueSearchSection } from "./sections/IssueSearchSection";
import { SignInSection } from "./sections/SignInSection";

export const Frame = (): JSX.Element => {
  return (
    <div
      className="flex flex-col w-full max-w-[1278px] items-start gap-[78px] relative px-4 py-8"
      data-model-id="1:19"
    >
      <h1 className="relative w-full [font-family:'Arial-Bold',Helvetica] font-bold text-black text-[28px] tracking-[0] leading-[normal] opacity-0 translate-y-[-1rem] animate-fade-in">
        Screen flows for Unified search
      </h1>

      <div className="w-full opacity-0 translate-y-[-1rem] animate-fade-in [--animation-delay:200ms]">
        <SignInSection />
      </div>

      <div className="w-full opacity-0 translate-y-[-1rem] animate-fade-in [--animation-delay:400ms]">
        <HomeSearchSection />
      </div>

      <div className="w-full opacity-0 translate-y-[-1rem] animate-fade-in [--animation-delay:600ms]">
        <IssueSearchSection />
      </div>

      <div className="w-full opacity-0 translate-y-[-1rem] animate-fade-in [--animation-delay:800ms]">
        <IssueDetailsSection />
      </div>
    </div>
  );
};
