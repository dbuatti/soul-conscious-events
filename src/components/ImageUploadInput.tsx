import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Image as ImageIcon, XCircle, Upload, Link as LinkIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

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

  const hasImage = !!imagePreviewUrl;

  return (
    <FormItem>
      {hasImage ? (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl border-2 border-border shadow-md">
            <img
              src={imagePreviewUrl!}
              alt="Event cover preview"
              className="w-full h-48 sm:h-56 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
            >
              <XCircle className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
          <div className="mt-3">
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
              <TabsList className="grid w-full grid-cols-3 dark:bg-secondary h-9">
                <TabsTrigger value="upload" className="text-xs"><Upload className="mr-1 h-3 w-3" /> Upload</TabsTrigger>
                <TabsTrigger value="url" className="text-xs"><LinkIcon className="mr-1 h-3 w-3" /> URL</TabsTrigger>
                <TabsTrigger value="defaults" className="text-xs"><Sparkles className="mr-1 h-3 w-3" /> Defaults</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-3">
                <label htmlFor="image-upload" className="flex items-center justify-between px-4 py-2 rounded-xl border border-input bg-background text-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors duration-200">
                  <span className="flex items-center truncate">
                    <ImageIcon className="mr-2 h-4 w-4 shrink-0" />
                    {selectedImage ? selectedImage.name : 'Choose a different file'}
                  </span>
                  <Button type="button" variant="outline" size="sm" className="ml-4 shrink-0">
                    Browse
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
              <TabsContent value="url" className="mt-3">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <>
                      <Input
                        id="imageUrl"
                        placeholder="Paste an image URL"
                        {...field}
                        onChange={handleImageUrlInputChange}
                        className="focus-visible:ring-primary"
                      />
                      <FormMessage />
                    </>
                  )}
                />
              </TabsContent>
              <TabsContent value="defaults" className="mt-3">
                <div className="grid grid-cols-3 gap-2">
                  {defaultImages.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => handleSelectDefault(img.url)}
                      className={cn(
                        "relative rounded-xl overflow-hidden border-2 transition-all duration-200",
                        "hover:border-primary hover:shadow-md",
                        imagePreviewUrl === img.url
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border"
                      )}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full h-14 sm:h-16 object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Tabs
            value={imageInputMode}
            onValueChange={(value) => {
              setImageInputMode(value as 'upload' | 'url' | 'defaults');
              if (value === 'upload') {
                form.setValue('imageUrl', '', { shouldValidate: true });
              } else if (value === 'url') {
                setSelectedImage(null);
                form.setValue('imageFile', undefined, { shouldValidate: true });
              }
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 dark:bg-secondary h-10">
              <TabsTrigger value="upload" className="text-sm font-medium"><Upload className="mr-1.5 h-4 w-4" /> Upload</TabsTrigger>
              <TabsTrigger value="url" className="text-sm font-medium"><LinkIcon className="mr-1.5 h-4 w-4" /> URL</TabsTrigger>
              <TabsTrigger value="defaults" className="text-sm font-medium"><Sparkles className="mr-1.5 h-4 w-4" /> Defaults</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-3">
              <label
                htmlFor="image-upload-empty"
                className="flex flex-col items-center justify-center w-full h-40 sm:h-48 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 cursor-pointer transition-all duration-300"
              >
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-7 w-7 text-primary/50" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Add a cover image</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">JPG, PNG or WebP</p>
                  </div>
                </div>
                <Input
                  id="image-upload-empty"
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
            <TabsContent value="url" className="mt-3">
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <>
                    <Input
                      id="imageUrl"
                      placeholder="Paste an image URL (e.g., https://example.com/photo.jpg)"
                      {...field}
                      onChange={handleImageUrlInputChange}
                      className="focus-visible:ring-primary"
                    />
                    <FormMessage />
                  </>
                )}
              />
            </TabsContent>
            <TabsContent value="defaults" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">Pick a default cover for your event</p>
              <div className="grid grid-cols-3 gap-2">
                {defaultImages.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => handleSelectDefault(img.url)}
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 transition-all duration-200",
                      "hover:border-primary hover:shadow-md hover:scale-[1.02]",
                      "border-border"
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
        </div>
      )}
    </FormItem>
  );
};

export default ImageUploadInput;
