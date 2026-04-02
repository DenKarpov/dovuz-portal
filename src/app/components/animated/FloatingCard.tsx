import { motion } from "motion/react";
import { type ReactNode } from "react";

interface FloatingCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function FloatingCard({ children, className = "", delay = 0 }: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -6,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}