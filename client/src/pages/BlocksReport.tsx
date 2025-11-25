import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  FileDown, 
  Building2, 
  ArrowLeft, 
  Filter,
  Loader2,
  Home,
  Users
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function BlocksReport() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<any[]>({
    queryKey: ["/api/blocks"],
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tenantAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/tenant-assignments"],
  });

  // Calculate statistics for each block
  const blocksWithStats = useMemo(() => {
    return blocks.map(block => {
      const blockProperties = properties.filter(p => p.blockId === block.id);
      const totalUnits = blockProperties.length;
      
      // Count occupied units
      const occupiedUnits = blockProperties.filter(property => {
        return tenantAssignments.some(
          assignment => 
            assignment.propertyId === property.id && 
            assignment.status === "active"
        );
      }).length;

      const occupancyRate = totalUnits > 0 
        ? Math.round((occupiedUnits / totalUnits) * 100) 
        : 0;

      return {
        ...block,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate,
      };
    });
  }, [blocks, properties, tenantAssignments]);

  // Filter blocks
  const filteredBlocks = useMemo(() => {
    return blocksWithStats.filter(block => {
      const searchLower = searchTerm.toLowerCase();
      return (
        block.name?.toLowerCase().includes(searchLower) ||
        block.address?.toLowerCase().includes(searchLower) ||
        block.postcode?.toLowerCase().includes(searchLower)
      );
    });
  }, [blocksWithStats, searchTerm]);

  const totalProperties = properties.length;
  const avgOccupancyRate = blocksWithStats.length > 0
    ? Math.round(
        blocksWithStats.reduce((sum, block) => sum + block.occupancyRate, 0) / 
        blocksWithStats.length
      )
    : 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const response = await apiRequest("POST", "/api/reports/blocks/pdf", {});
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blocks-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report exported",
        description: "Your PDF report has been downloaded successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 md:p-8 lg:p-12 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/reports">
            <Button variant="ghost" className="mb-2" data-testid="button-back-reports">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Blocks Report</h1>
              <p className="text-lg text-muted-foreground mt-1">
                Block-level statistics and occupancy metrics
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleExportPDF}
          disabled={isExporting || filteredBlocks.length === 0}
          size="lg"
          data-testid="button-export-pdf"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-5 w-5" />
              Export PDF
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle>Search & Filter</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Search Blocks</Label>
            <Input
              placeholder="Search by name, address, or postcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-blocks"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Blocks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredBlocks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Occupancy Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOccupancyRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenantAssignments.filter(a => a.status === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocks Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Block Details</CardTitle>
          <CardDescription>
            Showing {filteredBlocks.length} block{filteredBlocks.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No blocks found matching your search" : "No blocks found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Block Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-center">Total Units</TableHead>
                    <TableHead className="text-center">Occupied</TableHead>
                    <TableHead className="text-center">Vacant</TableHead>
                    <TableHead className="text-center">Occupancy Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlocks.map((block: any) => {
                    const occupancyColor = 
                      block.occupancyRate >= 90 ? "default" :
                      block.occupancyRate >= 70 ? "secondary" :
                      "destructive";

                    return (
                      <TableRow key={block.id}>
                        <TableCell className="font-medium">
                          <Link href={`/blocks/${block.id}`}>
                            <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" data-testid={`link-block-${block.id}`}>
                              <Building2 className="h-4 w-4" />
                              {block.name}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{block.address}</div>
                            {block.postcode && (
                              <div className="text-muted-foreground">{block.postcode}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            <Home className="h-3 w-3 mr-1" />
                            {block.totalUnits}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default">
                            <Users className="h-3 w-3 mr-1" />
                            {block.occupiedUnits}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {block.vacantUnits}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={occupancyColor}>
                            {block.occupancyRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
