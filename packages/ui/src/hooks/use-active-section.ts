"use client";

import { useEffect, useState } from "react";

export function useActiveSection() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (const section of sections) {
        const element = section as HTMLElement;
        const { offsetTop, offsetHeight } = element;
        const sectionId = section.getAttribute("id");

        if (
          scrollPosition >= offsetTop &&
          scrollPosition < offsetTop + offsetHeight
        ) {
          if (sectionId && sectionId !== activeSection) {
            setActiveSection(sectionId);
            window.history.replaceState(null, "", `#${sectionId}`);
          }
          break;
        }
      }
    };

    // Check on mount
    handleScroll();

    // Add scroll listener with throttling
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", scrollListener, { passive: true });
    return () => window.removeEventListener("scroll", scrollListener);
  }, [activeSection]);

  return activeSection;
}
