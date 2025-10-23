import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, AlertCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Property {
  id: string;
  name: string;
}

interface Inspection {
  id: string;
  propertyId: string;
  inspectionType: string;
  status: string;
  scheduledDate: string;
  completedDate?: string;
}

interface ComparisonReport {
  id: string;
  propertyId: string;
  checkInInspectionId: string;
  checkOutInspectionId: string;
  aiSummary: string;
  createdAt: string;
}

export default function ComparisonReports() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [checkInId, setCheckInId] = useState<string>("");
  const [checkOutId, setCheckOutId] = useState<string>("");
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  // Fetch properties
  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Fetch inspections for selected property
  const { data: inspections = [] } = useQuery<Inspection[]>({
    queryKey: [`/api/inspections/property/${selectedPropertyId}`],
    enabled: !!selectedPropertyId,
  });

  // Fetch existing comparison reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<ComparisonReport[]>({
    queryKey: ["/api/comparison-reports"],
  });

  // Generate comparison mutation
  const generateComparison = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId || !checkInId || !checkOutId) {
        throw new Error("Please select property and both inspections");
      }

      const response = await apiRequest("POST", "/api/ai/generate-comparison", {
        propertyId: selectedPropertyId,
        checkInInspectionId: checkInId,
        checkOutInspectionId: checkOutId,
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ["/api/comparison-reports"] });
      toast({
        title: "Comparison Generated",
        description: "AI comparison report created successfully (2 credits used)",
      });
      setSelectedReportId(report.id);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate comparison report",
      });
    },
  });

  const completedInspections = inspections.filter(i => i.status === "completed");
  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" data-testid="page-comparison-reports">
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3" data-testid="heading-comparison-reports">
          <FileText className="w-10 h-10" />
          Comparison Reports
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare check-in and check-out inspections with AI-powered analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Generate New Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Comparison</CardTitle>
            <CardDescription>
              Select a property and two completed inspections to compare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="Select property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check-in inspection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Check-in Inspection</label>
              <Select 
                value={checkInId} 
                onValueChange={setCheckInId}
                disabled={!selectedPropertyId}
              >
                <SelectTrigger data-testid="select-checkin">
                  <SelectValue placeholder="Select check-in inspection..." />
                </SelectTrigger>
                <SelectContent>
                  {completedInspections.map((inspection) => (
                    <SelectItem key={inspection.id} value={inspection.id}>
                      {inspection.inspectionType} - {inspection.completedDate ? format(new Date(inspection.completedDate), "MMM d, yyyy") : "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check-out inspection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Check-out Inspection</label>
              <Select 
                value={checkOutId} 
                onValueChange={setCheckOutId}
                disabled={!selectedPropertyId}
              >
                <SelectTrigger data-testid="select-checkout">
                  <SelectValue placeholder="Select check-out inspection..." />
                </SelectTrigger>
                <SelectContent>
                  {completedInspections
                    .filter(i => i.id !== checkInId)
                    .map((inspection) => (
                      <SelectItem key={inspection.id} value={inspection.id}>
                        {inspection.inspectionType} - {inspection.completedDate ? format(new Date(inspection.completedDate), "MMM d, yyyy") : "N/A"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={() => generateComparison.mutate()}
              disabled={!selectedPropertyId || !checkInId || !checkOutId || generateComparison.isPending}
              data-testid="button-generate-comparison"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generateComparison.isPending ? "Generating..." : "Generate Comparison (2 credits)"}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              View previously generated comparison reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No comparison reports yet</p>
                <p className="text-sm">Generate your first report to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {reports.map((report) => (
                  <Card 
                    key={report.id}
                    className={`cursor-pointer hover-elevate ${selectedReportId === report.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedReportId(report.id)}
                    data-testid={`card-report-${report.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(report.createdAt), "MMM d, yyyy")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.aiSummary.substring(0, 100)}...
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Report Details */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Comparison Analysis
            </CardTitle>
            <CardDescription>
              Generated on {format(new Date(selectedReport.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap bg-muted p-6 rounded-lg">
                {selectedReport.aiSummary}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
