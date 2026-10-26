import * as z from 'zod';
import { parseOrganiserContact } from '@/utils/booking';

export const eventFormSchema = z.object({
  eventName: z.string().min(2, { message: 'Event name must be at least 2 characters.' }),
  eventDate: z.date({ required_error: 'A date is required.' }),
  endDate: z.date().optional(),
  eventTime: z.string().optional().or(z.literal('')),
  placeName: z.string().optional().or(z.literal('')),
  fullAddress: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  // A booking link is optional: many organisers take bookings through a DM,
  // a PayID/Stripe link, or a post that holds the details.
  ticketLink: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  price: z.string().optional().or(z.literal('')),
  specialNotes: z.string().optional().or(z.literal('')),
  organizerContact: z.string().optional().or(z.literal('')),
  eventType: z.string().optional().or(z.literal('')),
  geographicalState: z.string().optional().or(z.literal('')),
  imageFile: z.instanceof(File).optional(),
  imageUrl: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  discountCode: z.string().optional().or(z.literal('')),
  googleMapsLink: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  recurringPattern: z.enum(['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'NONE']).optional().or(z.literal('')),
  recurringEndDate: z.date().optional(),
  eventDays: z.array(z.object({
    date: z.string(),
    start_time: z.string().optional().or(z.literal('')),
    end_time: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  })).optional(),
}).superRefine((values, ctx) => {
  // Every listing has to be actionable: a link, or a contact we can turn into
  // a booking button. Otherwise it is a dead end for anyone who sees it.
  const hasLink = !!values.ticketLink?.trim();
  const contact = (values.organizerContact ?? '').trim();

  if (!hasLink && !contact) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ticketLink'],
      message:
        'Add a booking link, or add a contact below (e.g. @yourhandle or your email) so people know how to book.',
    });
    return;
  }

  if (!hasLink && !parseOrganiserContact(contact).href) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['organizerContact'],
      message:
        'This looks like a name only. Add an Instagram @handle, email or phone number so people can actually book.',
    });
  }
});

export type EventFormValues = z.infer<typeof eventFormSchema>;