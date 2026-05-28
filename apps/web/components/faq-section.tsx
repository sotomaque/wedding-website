/**
 * Home-section FAQs, Lovebird-style. Flat list of question/answer pairs —
 * not collapsible — with the question in bold serif and the answer in cream
 * prose. Lovebird's design keeps everything visible so guests skim the
 * whole FAQ at once rather than expanding items.
 *
 * Currently renders a hardcoded sample matching Lovebird's standard
 * question set. The full feature (a `FaqItem` Prisma model + admin CRUD)
 * ships Phase 3; this component will take items as a prop then.
 *
 * Question copy mirrors Lovebird's standard FAQ template (generic templates,
 * not copyrightable phrasing). Answers are authored fresh.
 */

interface FaqItem {
  question: string;
  answer: string;
}

const PLACEHOLDER_FAQS: FaqItem[] = [
  {
    question: "What is the dress code for your wedding?",
    answer: "Formal Attire",
  },
  {
    question: "What will the weather be like?",
    answer:
      "Check the forecast closer to the day and pack accordingly. We recommend layers if the ceremony or reception involves outdoor time.",
  },
  {
    question: "When is the RSVP deadline?",
    answer:
      "Please RSVP by the date noted on your invitation so we can finalize the headcount with our venue.",
  },
  {
    question: "Am I allowed to bring my children?",
    answer:
      "We love your little ones, but we've decided to keep our celebration an adults-only event. We hope this gives you a chance to relax and enjoy the night.",
  },
  {
    question: "Will there be an open bar?",
    answer:
      "Yes — beer, wine, and a curated cocktail menu will be available throughout the reception. Cheers!",
  },
];

export function FaqSection() {
  return (
    <section id="faqs" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          FAQs
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />
        <div className="space-y-8">
          {PLACEHOLDER_FAQS.map((faq) => (
            <div key={faq.question}>
              <h3 className="font-serif font-semibold text-foreground text-lg md:text-xl mb-2">
                {faq.question}
              </h3>
              <p className="text-foreground/85 text-lg leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
