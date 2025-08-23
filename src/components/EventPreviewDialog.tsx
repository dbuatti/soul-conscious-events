import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, DollarSign, LinkIcon, Info, User, Tag, Ticket } from 'lucide-react';

interface EventPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: any; // Using 'any' for simplicity, but you could define a more specific type
  imagePreviewUrl: string | null;
}

const EventPreviewDialog: React.FC<EventPreviewDialogProps> = ({ isOpen, onClose, previewData, imagePreviewUrl }) => {
  if (!previewData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] dark:bg-card dark:border-border">
        <DialogHeader>
          <DialogTitle>Event Preview</DialogTitle>
          <DialogDescription>
            Review your event details before submitting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {imagePreviewUrl && (
            <div className="col-span-full flex justify-center mb-4">
              <a href={imagePreviewUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imagePreviewUrl}
                  alt="Event Preview"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </a>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="text-right font-medium text-foreground">Event Name:</p>
            <p className="col-span-3 text-foreground">{previewData.eventName}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <p className="text-right font-medium text-foreground">Date:</p>
            <p className="col-span-3 text-foreground">
              {previewData.eventDate ? format(new Date(previewData.eventDate), 'PPP') : 'N/A'}
              {previewData.endDate && ` - ${format(new Date(previewData.endDate), 'PPP')}`}
            </p>
          </div>
          {previewData.eventTime && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Time:</p>
              <p className="col-span-3 text-foreground">{previewData.eventTime}</p>
            </div>
          )}
          {previewData.placeName && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Place Name:</p>
              <p className="col-span-3 text-foreground">{previewData.placeName}</p>
            </div>
          )}
          {previewData.fullAddress && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Address:</p>
              <p className="col-span-3 text-foreground">{previewData.fullAddress}</p>
            </div>
          )}
          {previewData.description && (
            <div className="grid grid-cols-4 items-start gap-4">
              <p className="text-right font-medium text-foreground">Description:</p>
              <p className="col-span-3 whitespace-pre-wrap text-foreground">{previewData.description}</p>
            </div>
          )}
          {previewData.ticketLink && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Ticket Link:</p>
              <a href={previewData.ticketLink} target="_blank" rel="noopener noreferrer" className="col-span-3 text-primary hover:underline break-all">
                {previewData.ticketLink}
              </a>
            </div>
          )}
          {previewData.price && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Price:</p>
              <p className="col-span-3 text-foreground">{previewData.price}</p>
            </div>
          )}
          {previewData.specialNotes && (
            <div className="grid grid-cols-4 items-start gap-4">
              <p className="text-right font-medium text-foreground">Special Notes:</p>
              <p className="col-span-3 whitespace-pre-wrap text-foreground">{previewData.specialNotes}</p>
            </div>
          )}
          {previewData.organizerContact && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Organizer:</p>
              <p className="col-span-3 text-foreground">{previewData.organizerContact}</p>
            </div>
          )}
          {previewData.eventType && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Event Type:</p>
              <p className="col-span-3 text-foreground">{previewData.eventType}</p>
            </div>
          )}
          {previewData.discountCode && (
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Discount Code:</p>
              <p className="col-span-3 text-foreground">{previewData.discountCode}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventPreviewDialog;