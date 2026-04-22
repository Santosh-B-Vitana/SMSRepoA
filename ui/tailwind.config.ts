
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
    colors: {
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
        hover: 'hsl(var(--primary-hover))',
        light: 'hsl(var(--primary-light))'
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
        light: 'hsl(var(--secondary-light))'
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
        light: 'hsl(var(--destructive-light))'
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))'
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
        light: 'hsl(var(--accent-light))'
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))'
      },
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))'
      },
      sidebar: {
        DEFAULT: 'hsl(var(--sidebar-background))',
        foreground: 'hsl(var(--sidebar-foreground))',
        primary: 'hsl(var(--sidebar-primary))',
        'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
        accent: 'hsl(var(--sidebar-accent))',
        'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        border: 'hsl(var(--sidebar-border))',
        ring: 'hsl(var(--sidebar-ring))'
      },
      // Academic specific colors
      academic: {
        blue: 'hsl(var(--academic-blue))',
        light: 'hsl(var(--academic-light))',
        dark: 'hsl(var(--academic-dark))'
      },
      attendance: {
        present: 'hsl(var(--attendance-present))',
        absent: 'hsl(var(--attendance-absent))'
      },
      fee: {
        paid: 'hsl(var(--fee-paid))',
        pending: 'hsl(var(--fee-pending))'
      },
      success: {
        DEFAULT: 'hsl(var(--success))',
        foreground: 'hsl(var(--success-foreground))',
        light: 'hsl(var(--success-light))'
      },
      warning: {
        DEFAULT: 'hsl(var(--warning))',
        foreground: 'hsl(var(--warning-foreground))',
        light: 'hsl(var(--warning-light))'
      },
      // Chart colors
      chart: {
        1: 'hsl(var(--chart-1))',
        2: 'hsl(var(--chart-2))',
        3: 'hsl(var(--chart-3))',
        4: 'hsl(var(--chart-4))',
        5: 'hsl(var(--chart-5))'
      }
    },
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'sans-serif'
    ],
    brand: ['Poppins', 'sans-serif'],
    display: ['Space Grotesk', 'sans-serif'],
    devanagari: ['Noto Sans Devanagari', 'Mukta', 'sans-serif'],
    hindi: ['Mukta', 'Noto Sans Devanagari', 'sans-serif']
  },
    keyframes: {
      'accordion-down': {
        from: {
          height: '0'
        },
        to: {
          height: 'var(--radix-accordion-content-height)'
        }
      },
      'accordion-up': {
        from: {
          height: 'var(--radix-accordion-content-height)'
        },
        to: {
          height: '0'
        }
      },
      'slide-in': {
        '0%': {
          transform: 'translateX(-100%)',
          opacity: '0'
        },
        '100%': {
          transform: 'translateX(0)',
          opacity: '1'
        }
      },
      'fade-in': {
        '0%': {
          opacity: '0',
          transform: 'translateY(10px)'
        },
        '100%': {
          opacity: '1',
          transform: 'translateY(0)'
        }
      },
      'scale-in': {
        '0%': {
          transform: 'scale(0.95)',
          opacity: '0'
        },
        '100%': {
          transform: 'scale(1)',
          opacity: '1'
        }
      },
      // 🎨 NEW: Modern Spring Animations
      'bounce-in': {
        '0%': {
          transform: 'scale(0.3)',
          opacity: '0'
        },
        '50%': {
          transform: 'scale(1.05)',
          opacity: '0.8'
        },
        '70%': {
          transform: 'scale(0.97)'
        },
        '100%': {
          transform: 'scale(1)',
          opacity: '1'
        }
      },
      'slide-up': {
        '0%': {
          transform: 'translateY(100%)',
          opacity: '0'
        },
        '100%': {
          transform: 'translateY(0)',
          opacity: '1'
        }
      },
      'slide-down': {
        '0%': {
          transform: 'translateY(-100%)',
          opacity: '0'
        },
        '100%': {
          transform: 'translateY(0)',
          opacity: '1'
        }
      },
      'zoom-in': {
        '0%': {
          transform: 'scale(0)',
          opacity: '0'
        },
        '100%': {
          transform: 'scale(1)',
          opacity: '1'
        }
      },
      'float': {
        '0%, 100%': {
          transform: 'translateY(0)'
        },
        '50%': {
          transform: 'translateY(-10px)'
        }
      },
      'pulse-slow': {
        '0%, 100%': {
          opacity: '1'
        },
        '50%': {
          opacity: '0.5'
        }
      },
      'spin-slow': {
        from: {
          transform: 'rotate(0deg)'
        },
        to: {
          transform: 'rotate(360deg)'
        }
      }
    },
    animation: {
      'accordion-down': 'accordion-down 0.2s ease-out',
      'accordion-up': 'accordion-up 0.2s ease-out',
      'slide-in': 'slide-in 0.3s ease-out',
      'fade-in': 'fade-in 0.2s ease-out',
      'scale-in': 'scale-in 0.2s ease-out',
      // 🎨 NEW: Modern Animations
      'bounce-in': 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'slide-up': 'slide-up 0.3s ease-out',
      'slide-down': 'slide-down 0.3s ease-out',
      'zoom-in': 'zoom-in 0.3s ease-out',
      'float': 'float 3s ease-in-out infinite',
      'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      'spin-slow': 'spin-slow 3s linear infinite'
    }
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
