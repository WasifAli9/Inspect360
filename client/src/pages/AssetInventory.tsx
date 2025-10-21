import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Plus, Edit2, Trash2, Building2, Home, Calendar, Wrench } from "lucide-react";
import { assetInventory, type AssetInventory, type Property, type Block } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { createInsertSchema } from "drizzle-zod";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";

const baseAssetSchema = createInsertSchema(assetInventory).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

const assetFormSchema = baseAssetSchema.extend({
  name: z.string().min(1, "Asset name is required"),
  condition: z.enum(["excellent", "good", "fair", "poor", "needs_replacement"]),
  expectedLifespanYears: z.coerce.number().min(0, "Lifespan must be 0 or greater").optional(),
}).refine(
  (data) => data.propertyId || data.blockId,
  { message: "Either propertyId or blockId must be provided" }
);

type AssetFormValues = z.infer<typeof assetFormSchema>;

const conditionLabels = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  needs_replacement: "Needs Replacement",
};

const conditionColors = {
  excellent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  poor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  needs_replacement: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function AssetInventory() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetInventory | null>(null);
  const [filterType, setFilterType] = useState<"all" | "property" | "block">("all");
  const [filterId, setFilterId] = useState<string>("");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>("");

  // Fetch assets
  const { data: assets, isLoading: assetsLoading } = useQuery<AssetInventory[]>({
    queryKey: ["/api/asset-inventory"],
  });

  // Fetch properties for filter
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Fetch blocks for filter
  const { data: blocks } = useQuery<Block[]>({
    queryKey: ["/api/blocks"],
  });

  // Create asset mutation
  const createMutation = useMutation({
    mutationFn: async (data: AssetFormValues) => {
      return await apiRequest("POST", "/api/asset-inventory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-inventory"] });
      toast({
        title: "Success",
        description: "Asset created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setUploadedPhotoUrl("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create asset",
      });
    },
  });

  // Update asset mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AssetFormValues> }) => {
      return await apiRequest("PATCH", `/api/asset-inventory/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-inventory"] });
      toast({
        title: "Success",
        description: "Asset updated successfully",
      });
      setEditingAsset(null);
      setUploadedPhotoUrl("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update asset",
      });
    },
  });

  // Delete asset mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/asset-inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-inventory"] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete asset",
      });
    },
  });

  const createForm = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      supplier: "",
      datePurchased: undefined,
      condition: "good",
      expectedLifespanYears: undefined,
      propertyId: undefined,
      blockId: undefined,
      photoUrl: "",
    },
  });

  const editForm = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      supplier: "",
      datePurchased: undefined,
      condition: "good",
      expectedLifespanYears: undefined,
      propertyId: undefined,
      blockId: undefined,
      photoUrl: "",
    },
  });

  // Update edit form when editingAsset changes
  if (editingAsset && editForm.getValues().name !== editingAsset.name) {
    editForm.reset({
      name: editingAsset.name,
      description: editingAsset.description ?? "",
      supplier: editingAsset.supplier ?? "",
      datePurchased: editingAsset.datePurchased ?? undefined,
      condition: editingAsset.condition,
      expectedLifespanYears: editingAsset.expectedLifespanYears ?? undefined,
      propertyId: editingAsset.propertyId ?? undefined,
      blockId: editingAsset.blockId ?? undefined,
      photoUrl: editingAsset.photoUrl ?? "",
    });
    setUploadedPhotoUrl(editingAsset.photoUrl ?? "");
  }

  // Uppy instance for image upload
  const createUppy = () => {
    const uppy = new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ["image/*"],
      },
      autoProceed: false,
    }).use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file: any) {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          credentials: "include",
        });
        const { uploadURL } = await response.json();
        return {
          method: "PUT" as const,
          url: uploadURL,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        };
      },
    });

    uppy.on("upload-success", (_file: any, response: any) => {
      const uploadUrl = response?.uploadURL || response?.body?.uploadURL;
      if (uploadUrl) {
        const photoUrl = uploadUrl.split("?")[0];
        setUploadedPhotoUrl(photoUrl);
        
        if (editingAsset) {
          editForm.setValue("photoUrl", photoUrl);
        } else {
          createForm.setValue("photoUrl", photoUrl);
        }

        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
      }
    });

    return uppy;
  };

  const handleCreateSubmit = (data: AssetFormValues) => {
    // Add the uploaded photo URL if present
    if (uploadedPhotoUrl) {
      data.photoUrl = uploadedPhotoUrl;
    }
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: AssetFormValues) => {
    if (!editingAsset) return;
    
    // Add the uploaded photo URL if present
    if (uploadedPhotoUrl) {
      data.photoUrl = uploadedPhotoUrl;
    }
    
    updateMutation.mutate({ id: editingAsset.id, data });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter assets
  const filteredAssets = assets?.filter((asset) => {
    if (filterType === "all") return true;
    if (filterType === "property" && filterId) return asset.propertyId === filterId;
    if (filterType === "block" && filterId) return asset.blockId === filterId;
    return true;
  });

  const getLocationInfo = (asset: AssetInventory) => {
    if (asset.propertyId) {
      const property = properties?.find((p) => p.id === asset.propertyId);
      return property ? { type: "Property", name: property.name } : null;
    }
    if (asset.blockId) {
      const block = blocks?.find((b) => b.id === asset.blockId);
      return block ? { type: "Block", name: block.name } : null;
    }
    return null;
  };

  return (
    <div className="p-8 space-y-6" data-testid="page-asset-inventory">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3" data-testid="heading-asset-inventory">
            <Package className="w-10 h-10" />
            Asset Inventory
          </h1>
          <p className="text-muted-foreground mt-2">
            Track physical assets and equipment across properties and blocks
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="default" data-testid="button-create-asset">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-asset">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>
                Add a new physical asset or equipment to track
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., HVAC Unit, Refrigerator" data-testid="input-asset-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Details about the asset..."
                          data-testid="input-asset-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Supplier name" data-testid="input-asset-supplier" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="datePurchased"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Purchased</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            data-testid="input-asset-date-purchased"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-asset-condition">
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(conditionLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value} data-testid={`option-condition-${value}`}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="expectedLifespanYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Lifespan (Years)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            placeholder="e.g., 10"
                            data-testid="input-asset-lifespan"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-asset-property">
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {properties?.map((property) => (
                              <SelectItem key={property.id} value={property.id} data-testid={`option-property-${property.id}`}>
                                {property.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assign to a specific property
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="blockId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Block</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-asset-block">
                              <SelectValue placeholder="Select block" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {blocks?.map((block) => (
                              <SelectItem key={block.id} value={block.id} data-testid={`option-block-${block.id}`}>
                                {block.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assign to a block (building/complex)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Asset Photo</Label>
                  <Dashboard uppy={createUppy()} proudlyDisplayPoweredByUppy={false} height={200} />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      createForm.reset();
                      setUploadedPhotoUrl("");
                    }}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-asset"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Asset"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>Filter By</Label>
            <Select value={filterType} onValueChange={(value: any) => {
              setFilterType(value);
              setFilterId("");
            }}>
              <SelectTrigger data-testid="select-filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="property">By Property</SelectItem>
                <SelectItem value="block">By Block</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "property" && (
            <div className="flex-1">
              <Label>Property</Label>
              <Select value={filterId} onValueChange={setFilterId}>
                <SelectTrigger data-testid="select-filter-property">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === "block" && (
            <div className="flex-1">
              <Label>Block</Label>
              <Select value={filterId} onValueChange={setFilterId}>
                <SelectTrigger data-testid="select-filter-block">
                  <SelectValue placeholder="Select block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks?.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets List */}
      {assetsLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredAssets && filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => {
            const location = getLocationInfo(asset);
            return (
              <Card key={asset.id} className="hover-elevate" data-testid={`card-asset-${asset.id}`}>
                {asset.photoUrl && (
                  <div className="w-full h-48 overflow-hidden rounded-t-xl">
                    <img
                      src={asset.photoUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-asset-${asset.id}`}
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-asset-name-${asset.id}`}>
                        {asset.name}
                      </CardTitle>
                      {location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          {location.type === "Property" ? (
                            <Home className="w-3 h-3" />
                          ) : (
                            <Building2 className="w-3 h-3" />
                          )}
                          <span>{location.name}</span>
                        </div>
                      )}
                    </div>
                    <Badge className={conditionColors[asset.condition]}>
                      {conditionLabels[asset.condition]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {asset.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {asset.description}
                    </p>
                  )}
                  
                  <div className="space-y-1 text-sm">
                    {asset.supplier && (
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Supplier:</span>
                        <span>{asset.supplier}</span>
                      </div>
                    )}
                    {asset.datePurchased && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Purchased:</span>
                        <span>{format(new Date(asset.datePurchased), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {asset.expectedLifespanYears && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Expected Lifespan:</span>
                        <span>{asset.expectedLifespanYears} years</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Dialog
                      open={editingAsset?.id === asset.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingAsset(null);
                          setUploadedPhotoUrl("");
                        } else {
                          setEditingAsset(asset);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          data-testid={`button-edit-asset-${asset.id}`}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Asset</DialogTitle>
                          <DialogDescription>
                            Update asset information
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Asset Name *</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-edit-asset-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={editForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      value={field.value ?? ""}
                                      data-testid="input-edit-asset-description"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="supplier"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Supplier</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value ?? ""} data-testid="input-edit-asset-supplier" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={editForm.control}
                                name="datePurchased"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Date Purchased</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                        data-testid="input-edit-asset-date-purchased"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="condition"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Condition *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-asset-condition">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Object.entries(conditionLabels).map(([value, label]) => (
                                          <SelectItem key={value} value={value}>
                                            {label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={editForm.control}
                                name="expectedLifespanYears"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Expected Lifespan (Years)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        value={field.value ?? ""}
                                        data-testid="input-edit-asset-lifespan"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="propertyId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Property</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-asset-property">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {properties?.map((property) => (
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

                              <FormField
                                control={editForm.control}
                                name="blockId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Block</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-asset-block">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {blocks?.map((block) => (
                                          <SelectItem key={block.id} value={block.id}>
                                            {block.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Asset Photo</Label>
                              <Dashboard uppy={createUppy()} proudlyDisplayPoweredByUppy={false} height={200} />
                            </div>

                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingAsset(null);
                                  setUploadedPhotoUrl("");
                                }}
                                data-testid="button-cancel-edit"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                                data-testid="button-update-asset"
                              >
                                {updateMutation.isPending ? "Updating..." : "Update Asset"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(asset.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-asset-${asset.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {filterType !== "all" ? "No assets match the selected filter" : "Get started by adding your first asset"}
            </p>
            {filterType === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-asset">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Asset
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
