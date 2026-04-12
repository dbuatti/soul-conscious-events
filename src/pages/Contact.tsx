import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const contactFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  subject: z.string().min(1, { message: "Please select a subject." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

const Contact = () => {
  const form = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof contactFormSchema>) => {
    const { error } = await supabase.from('contact_submissions').insert([
      {
        name: values.name || null,
        email: values.email || null,
        subject: values.subject,
        message: values.message,
      },
    ]);

    if (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message.');
    } else {
      toast.success('Thank you! Your message has been sent.');
      form.reset();
    }
  };

  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">Contact Us</h1>
      </div>

      <div className="max-w-2xl mx-auto organic-card p-8 sm:p-12 rounded-[3rem]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Your Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Your Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Subject</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="recommendation">Recommendation</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Type your message here..." rows={5} {...field} className="rounded-xl bg-secondary/50 border-none focus-visible:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-14 rounded-2xl text-lg font-black shadow-xl transition-transform hover:scale-105">
              {form.formState.isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Form>
      </div>

      <div className="mt-20 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">For direct inquiries, reach us at:</p>
        <p className="text-3xl font-black text-foreground font-heading">daniele.buatti@gmail.com</p>
      </div>
    </div>
  );
};

export default Contact;