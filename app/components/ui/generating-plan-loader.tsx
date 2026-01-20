import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "AI is analyzing your project requirements...",
  "Breaking down your goal into manageable phases...",
  "Tailoring the plan to your experience level...",
  "Calculating realistic timelines for each task...",
  "Identifying key milestones and dependencies...",
  "Structuring tasks for optimal workflow...",
  "Considering your time availability...",
  "Generating actionable next steps...",
  "Organizing phases in logical sequence...",
  "Fine-tuning task priorities...",
  "Adapting plan to your deadline...",
  "Creating detailed task breakdowns...",
  "Optimizing for incremental progress...",
  "Adding flexibility for iterations...",
  "Balancing scope and timeline...",
  "Ensuring tasks are clear and actionable...",
  "Building in checkpoints for validation...",
  "Almost there! Finalizing your plan...",
  "Polishing the final details...",
  "Preparing your personalized roadmap...",
];

export function GeneratingPlanLoader({ title }: { title: string }) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");

  // Typewriter effect with backspace animation
  useEffect(() => {
    const currentMessage = LOADING_MESSAGES[currentMessageIndex];
    let charIndex = 0;
    let isTyping = true;
    setDisplayedText("");

    const typingInterval = setInterval(() => {
      if (isTyping) {
        // Typing phase - add characters
        if (charIndex < currentMessage.length) {
          setDisplayedText(currentMessage.slice(0, charIndex + 1));
          charIndex++;
        } else {
          // Finished typing, wait then start backspacing
          clearInterval(typingInterval);
          setTimeout(() => {
            isTyping = false;
            charIndex = currentMessage.length;

            // Backspace phase - remove characters
            const backspaceInterval = setInterval(() => {
              if (charIndex > 0) {
                charIndex--;
                setDisplayedText(currentMessage.slice(0, charIndex));
              } else {
                clearInterval(backspaceInterval);
                // Move to next message after backspacing completes
                setTimeout(() => {
                  setCurrentMessageIndex(
                    (prev) => (prev + 1) % LOADING_MESSAGES.length,
                  );
                }, 200);
              }
            }, 20); // Backspace speed: 20ms per character (faster than typing)
          }, 1500); // Wait 1.5s before backspacing
        }
      }
    }, 30); // Typing speed: 30ms per character

    return () => {
      clearInterval(typingInterval);
    };
  }, [currentMessageIndex]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-background flex w-full max-w-[450px] flex-col items-center gap-6 rounded-lg p-6 shadow-lg sm:p-8">
        <div className="relative">
          {/* Outer spinning ring */}
          <div className="border-primary/20 border-t-primary h-16 w-16 animate-spin rounded-full border-4" />
          {/* Inner pulsing circle */}
          <div className="bg-primary/20 absolute inset-0 m-auto h-8 w-8 animate-pulse rounded-full" />
        </div>
        <div className="w-full text-center">
          <h3 className="mb-3 text-base font-semibold sm:text-lg">{title}</h3>
          <p className="text-muted-foreground flex min-h-14 items-center justify-center text-xs leading-relaxed sm:text-sm">
            <span className="inline-flex items-baseline">
              {displayedText}
              <span className="animate-blink bg-primary ml-1 inline-block h-3.5 w-0.5 shrink-0 sm:h-4" />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
