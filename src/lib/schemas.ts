import * as z from 'zod';

export const eventFormSchema = z.object({
  eventName: z.string().min(2, { message: 'Event name must be at least 2 characters.' }),
  eventDate: z.date({ required_error: 'A date is required.' }),
  endDate: z.date().optional(),
  eventTime: z.string().optional().or(z.literal('')),
  placeName: z.string().optional().or(z.literal('')),
  fullAddress: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  ticketLink: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  price: z.string().optional().or(z.literal('')),
  specialNotes: z.string().optional().or(z.literal('')),
  organizerContact: z.string().optional().or(z.literal('')),
  eventType: z.string().optional().or(z.literal('')),
  geographicalState: z.string().optional().or(z.literal('')),
  imageFile: z.any().optional(),
  imageUrl: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  discountCode: z.string().optional().or(z.literal('')),
  googleMapsLink: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  recurringPattern: z.enum(['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'NONE']).optional().or(z.literal('')),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;