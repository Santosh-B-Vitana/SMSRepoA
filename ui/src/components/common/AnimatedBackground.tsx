import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface FloatingShapeProps {
  delay?: number;
  duration?: number;
  size?: number;
}

function FloatingShape({ delay = 0, duration = 20, size = 300 }: FloatingShapeProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setPosition({
      x: Math.random() * 100,
      y: Math.random() * 100,
    });
  }, []);

  return (
    <motion.div
      className="absolute rounded-full blur-3xl opacity-20"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        scale: [1, 1.2, 0.8, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

interface AnimatedBackgroundProps {
  variant?: 'gradient' | 'mesh' | 'particles';
  className?: string;
}

export function AnimatedBackground({ variant = 'gradient', className = '' }: AnimatedBackgroundProps) {
  if (variant === 'mesh') {
    return (
      <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <FloatingShape delay={0} duration={25} size={400} />
        <FloatingShape delay={5} duration={30} size={350} />
        <FloatingShape delay={10} duration={20} size={300} />
      </div>
    );
  }

  if (variant === 'particles') {
    return (
      <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/5" />
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }

  // Default gradient variant
  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0 opacity-50"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 80%, hsl(var(--accent) / 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 40% 20%, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

// Grid background overlay
export function GridBackground({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`fixed inset-0 -z-10 ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--border) / 0.05) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--border) / 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }}
    />
  );
}

// Dot pattern background
export function DotPattern({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`fixed inset-0 -z-10 ${className}`}
      style={{
        backgroundImage: 'radial-gradient(hsl(var(--border) / 0.1) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />
  );
}
