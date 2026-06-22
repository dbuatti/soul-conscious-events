import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Image as ImageIcon, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const defaultImages = [
  {
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80',
    label: 'Forest',
  },
  {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    label: 'Beach',
  },
  {
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
    label: 'Mountains',
  },
  {
    url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=80',
    label: 'Forest Path',
  },
  {
    url: 'https://images.unsplash.com/photo-1470071459604-7b8ec44ffd5b?w=600&q=80',
    label: 'Sunbeams',
  },
  {
    url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80',
    label: 'Desert',
  },
];

interface ImageUploadInputProps {
  form: UseFormReturn<Record<string, unknown>>;
  currentImageUrl?: string | null;
  name: 'imageFile' | 'imageUrl';
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ form, currentImageUrl, name }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'defaults'>(
    currentImageUrl && !currentImageUrl.includes('supabase.co/storage/v1/object/public/event-images') ? 'url' : 'upload'
  );

  useEffect(() => {
    setImagePreviewUrl(currentImageUrl || null);
    if (currentImageUrl && !currentImageUrl.includes('supabase.co/storage/v1/object/public/event-images')) {
      setImageInputMode('url');
    } else {
      setImageInputMode('upload');
    }
    setSelectedImage(null);
    form.setValue(name, undefined);
    form.setValue('imageUrl', currentImageUrl || '');
  }, [currentImageUrl, form, name]);

  const isDefaultImage = (url: string) => defaultImages.some((img) => img.url === url);

  useEffect(() => {
    if (currentImageUrl && isDefaultImage(currentImageUrl)) {
      setImageInputMode('defaults');
    }
  }, [currentImageUrl]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      form.setValue('imageFile', file, { shouldValidate: true });
      form.setValue('imageUrl', '', { shouldValidate: true });
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(currentImageUrl || null);
      form.setValue('imageFile', undefined, { shouldValidate: true });
    }
  };

  const handleImageUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    form.setValue('imageUrl', url, { shouldValidate: true });
    if (url) {
      setImagePreviewUrl(url);
      setSelectedImage(null);
      form.setValue('imageFile', undefined, { shouldValidate: true });
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleSelectDefault = (url: string) => {
    setImagePreviewUrl(url);
    setSelectedImage(null);
    form.setValue('imageFile', undefined, { shouldValidate: true });
    form.setValue('imageUrl', url, { shouldValidate: true });
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    form.setValue('imageFile', undefined, { shouldValidate: true });
    form.setValue('imageUrl', '', { shouldValidate: true });
  };

  const displayFileName = () => {
    if (selectedImage) {
      return selectedImage.name;
    }
    if (currentImageUrl && currentImageUrl.includes('supabase.co/storage/v1/object/public/event-images')) {
      return currentImageUrl.split('/').pop();
    }
    return 'No file chosen';
  };

  return (
    <FormItem>
      <Tabs
        value={imageInputMode}
        onValueChange={(value) => {
          setImageInputMode(value as 'upload' | 'url' | 'defaults');
          if (value === 'upload') {
            form.setValue('imageUrl', '', { shouldValidate: true });
            setImagePreviewUrl(selectedImage ? URL.createObjectURL(selectedImage) : currentImageUrl || null);
          } else if (value === 'url') {
            setSelectedImage(null);
            form.setValue('imageFile', undefined, { shouldValidate: true });
            setImagePreviewUrl(form.getValues('imageUrl') || currentImageUrl || null);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 dark:bg-secondary">
          <TabsTrigger value="upload" className="text-xs sm:text-sm">Upload</TabsTrigger>
          <TabsTrigger value="url" className="text-xs sm:text-sm">URL</TabsTrigger>
          <TabsTrigger value="defaults" className="text-xs sm:text-sm">Defaults</TabsTrigger>
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
        <TabsContent value="defaults" className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">Choose a default cover image</p>
          <div className="grid grid-cols-3 gap-2">
            {defaultImages.map((img) => (
              <button
                key={img.url}
                type="button"
                onClick={() => handleSelectDefault(img.url)}
                className={cn(
                  "relative rounded-lg overflow-hidden border-2 transition-all duration-200",
                  "hover:border-primary hover:shadow-md",
                  imagePreviewUrl === img.url
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                )}
              >
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-16 sm:h-20 object-cover"
                  loading="lazy"
                />
                <span className="block text-[10px] font-medium text-center py-1 text-muted-foreground truncate">
                  {img.label}
                </span>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      {imagePreviewUrl && !isDefaultImage(imagePreviewUrl) && (
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
