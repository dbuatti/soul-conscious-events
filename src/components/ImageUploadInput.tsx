import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Image as ImageIcon, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { z } from 'zod';

interface ImageUploadInputProps {
  form: UseFormReturn<any>; // Use any for now, as the parent form schema can vary
  currentImageUrl?: string | null; // Existing image URL from the database
  name: 'imageFile' | 'imageUrl'; // Field names for react-hook-form
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ form, currentImageUrl, name }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>(
    currentImageUrl && !currentImageUrl.includes('supabase.co/storage/v1/object/public/event-images') ? 'url' : 'upload'
  );

  // Effect to update internal state when currentImageUrl prop changes (e.g., on initial load or event data refresh)
  useEffect(() => {
    setImagePreviewUrl(currentImageUrl || null);
    if (currentImageUrl && !currentImageUrl.includes('supabase.co/storage/v1/object/public/event-images')) {
      setImageInputMode('url');
    } else {
      setImageInputMode('upload');
    }
    setSelectedImage(null); // Clear any pending file selection
    form.setValue(name, undefined); // Clear form's imageFile field
    form.setValue('imageUrl', currentImageUrl || ''); // Set form's imageUrl field
  }, [currentImageUrl, form, name]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      form.setValue('imageFile', file, { shouldValidate: true });
      form.setValue('imageUrl', '', { shouldValidate: true }); // Clear URL field if file is selected
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(currentImageUrl || null); // Revert to original if cleared
      form.setValue('imageFile', undefined, { shouldValidate: true });
    }
  };

  const handleImageUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    form.setValue('imageUrl', url, { shouldValidate: true });
    if (url) {
      setImagePreviewUrl(url);
      setSelectedImage(null); // Clear file if URL is entered
      form.setValue('imageFile', undefined, { shouldValidate: true });
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    form.setValue('imageFile', undefined, { shouldValidate: true });
    form.setValue('imageUrl', '', { shouldValidate: true }); // Clear the URL field
  };

  const displayFileName = () => {
    if (selectedImage) {
      return selectedImage.name;
    }
    if (currentImageUrl && currentImageUrl.includes('supabase.co/storage/v1/object/public/event-images')) {
      return currentImageUrl.split('/').pop(); // Extract filename from Supabase URL
    }
    return 'No file chosen';
  };

  return (
    <FormItem>
      <Tabs
        value={imageInputMode}
        onValueChange={(value) => {
          setImageInputMode(value as 'upload' | 'url');
          if (value === 'upload') {
            form.setValue('imageUrl', '', { shouldValidate: true });
            setImagePreviewUrl(selectedImage ? URL.createObjectURL(selectedImage) : currentImageUrl || null);
          } else {
            setSelectedImage(null);
            form.setValue('imageFile', undefined, { shouldValidate: true });
            setImagePreviewUrl(form.getValues('imageUrl') || currentImageUrl || null);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 dark:bg-secondary">
          <TabsTrigger value="upload">Upload Image</TabsTrigger>
          <TabsTrigger value="url">Image URL</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-4">
          <label htmlFor="image-upload" className="flex items-center justify-between px-4 py-2 rounded-md border border-input bg-background text-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors duration-200">
            <span className="flex items-center">
              <ImageIcon className="mr-2 h-4 w-4" />
              {displayFileName()}
            </span>
            <Button type="button" variant="outline" size="sm" className="ml-4">
              Choose File
            </Button>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="sr-only"
            />
          </label>
          <FormField
            control={form.control}
            name="imageFile"
            render={() => <FormMessage />}
          />
        </TabsContent>
        <TabsContent value="url" className="mt-4">
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <>
                <Input
                  id="imageUrl"
                  placeholder="e.g., https://example.com/image.jpg"
                  {...field}
                  onChange={handleImageUrlInputChange}
                  className="focus-visible:ring-primary"
                />
                <FormMessage />
              </>
            )}
          />
        </TabsContent>
      </Tabs>
      {imagePreviewUrl && (
        <div className="mt-2 flex items-center space-x-2">
          <img src={imagePreviewUrl} alt="Current Event Image" className="h-20 w-20 object-cover rounded-md border border-border shadow-md" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveImage}
            className="text-destructive hover:text-destructive/80 transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            <XCircle className="mr-1 h-4 w-4" /> Remove
          </Button>
        </div>
      )}
    </FormItem>
  );
};

export default ImageUploadInput;