"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { cn, charRevealDelay } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
}: {
  words: string;
  className?: string;
  filter?: boolean;
}) => {
  const [scope, animate] = useAnimate();
  let wordsArray = words.split("");
  useEffect(() => {
    const delayMs = charRevealDelay(words);
    animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: delayMs / 1000,
        delay: stagger(delayMs / 1000),
      }
    );
  }, [scope.current, words, filter]);

  const renderWords = () => {
    return (
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className="dark:text-white text-black opacity-0"
              style={{
                filter: filter ? "blur(10px)" : "none",
              }}
            >
              {word}{""}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn("font-bold", className)}>
      <div className="mt-4">
        <div className="dark:text-white text-black text-2xl leading-snug tracking-wide">
          {renderWords()}
        </div>
      </div>
    </div>
  );
};
