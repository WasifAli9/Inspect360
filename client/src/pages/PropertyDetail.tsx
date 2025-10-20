import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Home } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PropertyDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");

  const { data: property, isLoading: loadingProperty } = useQuery<any>({
    queryKey: ["/api/properties", id],
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery<any[]>({
    queryKey: ["/api/properties", id, "units"],
    enabled: !!id,
  });

  const createUnit = useMutation({
    mutationFn: async (data: { unitNumber: string }) => {
      return await apiRequest("/api/units", "POST", { ...data, propertyId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", id, "units"] });
      toast({
        title: "Success",
        description: "Unit created successfully",
      });
      setDialogOpen(false);
      setUnitNumber("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create unit",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber) {
      toast({
        title: "Validation Error",
        description: "Please enter a unit number",
        variant: "destructive",
      });
      return;
    }
    createUnit.mutate({ unitNumber });
  };

  if (loadingProperty || loadingUnits) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8">
        <div className="text-destructive">Property not found</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{property.name}</h1>
        <p className="text-muted-foreground">{property.address}</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Units</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent" data-testid="button-create-unit">
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Unit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="unitNumber">Unit Number</Label>
                <Input
                  id="unitNumber"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g., 101, A1, 2B"
                  data-testid="input-unit-number"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createUnit.isPending}
                data-testid="button-submit-unit"
              >
                {createUnit.isPending ? "Creating..." : "Create Unit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {units.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Home className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No units yet</p>
            <p className="text-muted-foreground mb-4">Add units to this property to start inspections</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {units.map((unit: any) => (
            <Card key={unit.id} className="hover-elevate" data-testid={`card-unit-${unit.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" />
                  Unit {unit.unitNumber}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unit.tenantId && (
                  <p className="text-sm text-muted-foreground">Tenant: {unit.tenantId}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
