import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { ReactNode } from 'react';

// 🎨 Subtle, smooth animation variants - matching academics module style
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.15,
      ease: "easeOut"
    }
  }
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.12,
      ease: "easeOut"
    }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.01
    }
  }
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.15,
      ease: "easeOut"
    }
  }
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.15,
      ease: "easeOut"
    }
  }
};

export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  }
};

export const zoomIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.12,
      ease: "easeOut"
    }
  }
};

interface AnimatedWrapperProps extends Omit<HTMLMotionProps<"div">, 'variants'> {
  children: ReactNode;
  variant?: 'fadeInUp' | 'fadeInScale' | 'slideInLeft' | 'slideInRight' | 'bounceIn' | 'zoomIn';
  delay?: number;
}

const variantMap = {
  fadeInUp,
  fadeInScale,
  slideInLeft,
  slideInRight,
  bounceIn,
  zoomIn
};

export function AnimatedWrapper({ 
  children, 
  variant = 'fadeInUp', 
  delay = 0,
  ...props 
}: AnimatedWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variantMap[variant]}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for lists
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  staggerDelay?: number;
}

export function StaggerContainer({ children, staggerDelay = 0.03, ...props }: StaggerContainerProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.01
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.12,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Hover scale effect
interface HoverScaleProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  scale?: number;
}

export function HoverScale({ children, scale = 1.02, ...props }: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
