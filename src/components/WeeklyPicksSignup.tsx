import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from '@/components/SessionContextProvider';
import { getCitySlugForState, NEWSLETTER_CITIES } from '@/lib/cities';
import { subscribeToWeeklyPicks } from '@/services/newsletter-service';
import { supabase } from '@/integrations/supabase/client';

interface WeeklyPicksSignupProps {
  defaultCity?: string;
  source?: string;
  className?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WeeklyPicksSignup: React.FC<WeeklyPicksSignupProps> = ({
  defaultCity,
  source = 'website',
  className,
}) => {
  const { defaultState } = useSession();
  const [email, setEmail] = useState('');
  const [city, setCity] = useState(defaultCity || getCitySlugForState(defaultState));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribeToWeeklyPicks(email, city, source);
      setIsSubscribed(true);
      toast.success('You’re on the weekly picks list!');

      void supabase.from('page_visit_logs').insert([{
        user_id: null,
        page_path: window.location.pathname,
        action_type: 'newsletter_signup',
      }]).then(({ error: logError }) => {
        if (logError) console.error('Error logging newsletter signup:', logError);
      });
    } catch (err) {
      console.error('Newsletter signup failed:', err);
      setError('We couldn’t save your email right now. Please try again shortly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div id="weekly-picks" className={`organic-card rounded-[1.5rem] p-5 sm:p-6 text-center scroll-mt-24 ${className || ''}`} role="status">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
        <h2 className="text-2xl font-heading font-semibold text-foreground">You’re on the list.</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Your next local guide is on its way. In the meantime, explore what’s coming up.
        </p>
        <Button asChild variant="outline" className="mt-5 rounded-full">
          <Link to={city === 'all' ? '/' : `/${city}`}>Browse upcoming events</Link>
        </Button>
      </div>
    );
  }

  return (
    <section id="weekly-picks" className={`organic-card rounded-[1.5rem] p-5 sm:p-6 scroll-mt-24 ${className || ''}`} aria-labelledby="weekly-picks-title">
      <div className="flex items-start gap-4">
        <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow mb-2">A little inspiration, weekly</p>
          <h2 id="weekly-picks-title" className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">
            The weekly five
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl">
            Five hand-picked conscious events near you, delivered once a week. No noise, no spam.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            autoComplete="email"
            required
            className="h-12 rounded-full bg-card flex-1"
          />
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger aria-label="Choose your city" className="h-12 rounded-full bg-card sm:w-44">
              <SelectValue placeholder="Choose city" />
            </SelectTrigger>
            <SelectContent>
              {NEWSLETTER_CITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isSubmitting} className="h-12 rounded-full px-6 font-semibold shrink-0">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Joining…' : 'Send me the guide'}
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        <p className="mt-3 text-xs text-muted-foreground">
          By subscribing you agree to our <Link to="/privacy" className="underline hover:text-foreground">privacy policy</Link>. Unsubscribe any time.
        </p>
      </form>
    </section>
  );
};

export default WeeklyPicksSignup;
