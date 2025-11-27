import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { offlineQueue, useOnlineStatus } from "@/lib/offlineQueue";
import type { QuickAddMaintenance } from "@shared/schema";
import { quickAddMaintenanceSchema } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, X, Image as ImageIcon } from "lucide-react";
// Removed Uppy - using simple file input instead

interface QuickAddMaintenanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  blockId?: string;
  inspectionId?: string;
  inspectionEntryId?: string;
  fieldLabel?: string;
  sectionTitle?: string;
  initialPhotos?: string[];
}

export function QuickAddMaintenanceSheet({
  open,
  onOpenChange,
  propertyId,
  blockId,
  inspectionId,
  inspectionEntryId,
  fieldLabel,
  sectionTitle,
  initialPhotos = [],
}: QuickAddMaintenanceSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhotoUrls(initialPhotos);
  }, [initialPhotos, open]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises: Promise<string>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const uploadPromise = (async () => {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/objects/upload-file', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${errorText.substring(0, 100)}`);
          }

          const data = await response.json();
          const photoUrl = data.url || data.path;
          
          if (!photoUrl) {
            throw new Error('Upload response missing URL');
          }

          return photoUrl;
        } catch (error: any) {
          console.error('[QuickAddMaintenanceSheet] Upload error:', error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${error.message}`,
            variant: "destructive",
          });
          throw error;
        }
      })();

      uploadPromises.push(uploadPromise);
    }

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotoUrls(prev => [...prev, ...uploadedUrls]);
      toast({
        title: "Upload Successful",
        description: `${uploadedUrls.length} photo(s) uploaded successfully`,
      });
    } catch (error) {
      // Individual errors already handled above
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  // If we have a blockId but no propertyId, fetch properties for the block
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    enabled: !!blockId && !propertyId,
  });

  // Filter properties to only those in the current block - memoized to avoid re-renders
  const blockProperties = useMemo(() => {
    if (blockId && !propertyId) {
      return properties.filter(p => p.blockId === blockId);
    }
    return [];
  }, [blockId, propertyId, properties]);

  // Derive the default property ID for form reset
  const defaultPropertyId = useMemo(() => {
    return propertyId || (blockProperties.length === 1 ? blockProperties[0].id : "");
  }, [propertyId, blockProperties]);

  const form = useForm<QuickAddMaintenance>({
    resolver: zodResolver(quickAddMaintenanceSchema),
    defaultValues: {
      title: "",
      description: "",
      propertyId: defaultPropertyId,
      priority: "medium",
      photoUrls: [],
      inspectionId: inspectionId || undefined,
      inspectionEntryId: inspectionEntryId || undefined,
      source: "inspection",
    },
  });

  // Track previous inspectionEntryId to detect actual context changes
  const prevEntryIdRef = useRef<string | undefined>(undefined);

  // Reset form only when the sheet opens OR when the inspection entry actually changes
  useEffect(() => {
    const entryChanged = inspectionEntryId !== prevEntryIdRef.current;
    if (open && entryChanged) {
      form.reset({
        title: "",
        description: "",
        propertyId: defaultPropertyId,
        priority: "medium",
        photoUrls: [],
        inspectionId: inspectionId || undefined,
        inspectionEntryId: inspectionEntryId || undefined,
        source: "inspection",
      });
      prevEntryIdRef.current = inspectionEntryId;
    }
  }, [open, inspectionId, inspectionEntryId, defaultPropertyId, form]);

  // Update propertyId when blockProperties change (inside useEffect to prevent infinite loops)
  useEffect(() => {
    if (blockProperties.length === 1 && !form.getValues("propertyId")) {
      form.setValue("propertyId", blockProperties[0].id);
    }
  }, [blockProperties, form]);

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: QuickAddMaintenance) => {
      return await apiRequest("POST", "/api/maintenance/quick", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"], refetchType: "active" });
      toast({
        title: "Maintenance Request Created",
        description: "The maintenance request has been logged successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Log Maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: QuickAddMaintenance) => {
    setIsSubmitting(true);

    const submissionData = {
      ...data,
      photoUrls: photoUrls,
    };

    try {
      if (isOnline) {
        await createMaintenanceMutation.mutateAsync(submissionData);
        setPhotoUrls([]);
      } else {
        offlineQueue.enqueueMaintenance(submissionData);
        toast({
          title: "Maintenance Queued",
          description: "Request will be logged when you're back online",
        });
        form.reset();
        setPhotoUrls([]);
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Maintenance Issue</SheetTitle>
          <SheetDescription>
            {sectionTitle && fieldLabel 
              ? `Log a maintenance issue for ${fieldLabel} in ${sectionTitle}`
              : "Log a maintenance issue found during inspection"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Leaking faucet, Damaged wall, Broken window"
                      data-testid="input-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property selector for block-level inspections */}
            {blockId && !propertyId && blockProperties.length > 0 && (
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {blockProperties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the issue in detail..."
                      rows={4}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Photos</FormLabel>
              {photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Maintenance photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        data-testid={`button-remove-photo-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="photo-upload-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  data-testid="button-add-photo"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      {photoUrls.length > 0 ? "Add More Photos" : "Add Photos"}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Upload photos of the maintenance issue (max 10MB per file, up to 5 files)
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
                data-testid="button-log-maintenance"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging...
                  </>
                ) : (
                  <>Log Request{!isOnline && " (Offline)"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
