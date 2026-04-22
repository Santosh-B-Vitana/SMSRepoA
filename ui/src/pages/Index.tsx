import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/common/AnimatedBackground';
import { AnimatedWrapper } from '@/components/common/AnimatedWrapper';
import { GraduationCap, Users, BookOpen, BarChart3, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to their dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground variant="gradient" />
      
      <div className="container mx-auto px-4 relative z-10">
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            {/* Logo & Brand */}
            <div className="flex justify-center mb-8">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl animate-float">
                <GraduationCap className="h-12 w-12 sm:h-14 sm:w-14 text-white" />
              </div>
            </div>

            {/* Hero Text */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  Vitana Schools
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Complete School Management System
              </p>
              <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl mx-auto">
                Streamline admissions, attendance, fees, examinations, and more with our modern, all-in-one platform.
              </p>
            </div>

            {/* Features Grid */}
            <AnimatedWrapper variant="fadeInUp" delay={0.3}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 mb-12">
                <div className="glass-card p-4 sm:p-6 text-center hover-lift">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base">Student Management</h3>
                  <p className="text-xs text-muted-foreground mt-1">Comprehensive profiles</p>
                </div>
                <div className="glass-card p-4 sm:p-6 text-center hover-lift">
                  <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-accent" />
                  <h3 className="font-semibold text-sm sm:text-base">Academic Tools</h3>
                  <p className="text-xs text-muted-foreground mt-1">Grades & exams</p>
                </div>
                <div className="glass-card p-4 sm:p-6 text-center hover-lift">
                  <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-success" />
                  <h3 className="font-semibold text-sm sm:text-base">Analytics</h3>
                  <p className="text-xs text-muted-foreground mt-1">Real-time insights</p>
                </div>
                <div className="glass-card p-4 sm:p-6 text-center hover-lift">
                  <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-warning" />
                  <h3 className="font-semibold text-sm sm:text-base">Modern UI</h3>
                  <p className="text-xs text-muted-foreground mt-1">Beautiful design</p>
                </div>
              </div>
            </AnimatedWrapper>

            {/* CTA Buttons */}
            <AnimatedWrapper variant="bounceIn" delay={0.5}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  variant="gradient" 
                  size="lg" 
                  onClick={() => navigate('/login')}
                  className="text-base sm:text-lg px-8 py-6"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate('/login')}
                  className="text-base sm:text-lg px-8 py-6"
                >
                  Sign In
                </Button>
              </div>
            </AnimatedWrapper>

            {/* Demo Badge */}
            <AnimatedWrapper variant="fadeInUp" delay={0.7}>
              <div className="mt-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Try demo: admin@vitanaSchools.edu / password</span>
                </div>
              </div>
            </AnimatedWrapper>
          </div>
        </AnimatedWrapper>
      </div>
    </div>
  );
};

export default Index;
