import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ArrowRight, User, Building2, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface ComparisonReport {
  id: string;
  propertyId: string;
  tenantId: string;
  status: "draft" | "under_review" | "awaiting_signatures" | "signed" | "filed";
  totalEstimatedCost: string;
  operatorSignature: string | null;
  tenantSignature: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-500" },
  under_review: { label: "Under Review", color: "bg-blue-500" },
  awaiting_signatures: { label: "Awaiting Signatures", color: "bg-amber-500" },
  signed: { label: "Signed", color: "bg-green-500" },
  filed: { label: "Filed", color: "bg-slate-600" },
};

export default function ComparisonReports() {
  const { data: reports = [], isLoading } = useQuery<ComparisonReport[]>({
    queryKey: ["/api/comparison-reports"],
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || "Unknown Property";
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" data-testid="page-comparison-reports">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3" data-testid="heading-comparison-reports">
            <FileText className="w-10 h-10 text-primary" />
            Comparison Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered check-in vs check-out analysis with cost estimation and signatures
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Comparison Reports</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Comparison reports are automatically generated when a check-out inspection is completed with items marked for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const statusInfo = statusConfig[report.status];
            const totalCost = parseFloat(report.totalEstimatedCost);
            
            return (
              <Card 
                key={report.id} 
                className="hover-elevate transition-all duration-150"
                data-testid={`card-report-${report.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Status and Date */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={`${statusInfo.color} text-white`}>
                          {statusInfo.label}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(report.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>

                      {/* Property */}
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{getPropertyName(report.propertyId)}</span>
                      </div>

                      {/* Cost */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-semibold">
                          ${totalCost.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">estimated tenant liability</span>
                      </div>

                      {/* Signatures */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Operator:</span>
                          {report.operatorSignature ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Signed
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Tenant:</span>
                          {report.tenantSignature ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Signed
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View Button */}
                    <Link href={`/comparisons/${report.id}`}>
                      <a>
                        <Button variant="outline" size="sm" data-testid={`button-view-${report.id}`}>
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </a>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
