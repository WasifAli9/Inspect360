import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users, 
  ArrowLeft, 
  Filter,
  Loader2,
  Building2,
  Home
} from "lucide-react";
import { Link } from "wouter";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TenantsReport() {
  const { toast } = useToast();
  const [filterBlock, setFilterBlock] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: tenantAssignments = [], isLoading: tenantsLoading } = useQuery<any[]>({
    queryKey: ["/api/tenant-assignments"],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<any[]>({
    queryKey: ["/api/blocks"],
  });

  const isLoading = tenantsLoading || propertiesLoading || blocksLoading;

  // Enrich tenant data with property and block information
  const enrichedTenants = useMemo(() => {
    return tenantAssignments.map(tenant => {
      const property = properties.find(p => p.id === tenant.propertyId);
      const block = property ? blocks.find(b => b.id === property.blockId) : null;

      const leaseEndDate = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : null;
      const daysUntilExpiry = leaseEndDate ? differenceInDays(leaseEndDate, new Date()) : null;
      const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 60;

      return {
        ...tenant,
        property,
        block,
        daysUntilExpiry,
        isExpiringSoon,
        monthlyRent: tenant.monthlyRent ? parseFloat(tenant.monthlyRent) : 0,
        depositAmount: tenant.depositAmount ? parseFloat(tenant.depositAmount) : 0,
      };
    });
  }, [tenantAssignments, properties, blocks]);

  // Filter tenants
  const filteredTenants = useMemo(() => {
    let filtered = enrichedTenants;

    if (filterBlock !== "all") {
      filtered = filtered.filter(t => t.property?.blockId === filterBlock);
    }

    if (filterProperty !== "all") {
      filtered = filtered.filter(t => t.propertyId === filterProperty);
    }

    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter(t => t.status === "active");
      } else if (filterStatus === "expiring") {
        filtered = filtered.filter(t => t.isExpiringSoon);
      } else if (filterStatus === "expired") {
        filtered = filtered.filter(t => t.daysUntilExpiry !== null && t.daysUntilExpiry < 0);
      }
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.tenantFirstName?.toLowerCase().includes(searchLower) ||
        t.tenantLastName?.toLowerCase().includes(searchLower) ||
        t.tenantEmail?.toLowerCase().includes(searchLower) ||
        t.property?.address?.toLowerCase().includes(searchLower) ||
        t.property?.unitNumber?.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => {
      // Sort by block, then property unit
      const blockCompare = (a.block?.name || "").localeCompare(b.block?.name || "");
      if (blockCompare !== 0) return blockCompare;
      return (a.property?.unitNumber || "").localeCompare(b.property?.unitNumber || "");
    });
  }, [enrichedTenants, filterBlock, filterProperty, filterStatus, searchTerm]);

  // Summary statistics
  const totalTenants = filteredTenants.length;
  const activeTenants = filteredTenants.filter(t => t.status === "active").length;
  const expiringSoon = filteredTenants.filter(t => t.isExpiringSoon).length;
  const totalMonthlyRent = filteredTenants
    .filter(t => t.status === "active")
    .reduce((sum, t) => sum + t.monthlyRent, 0);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const filters = {
        blockId: filterBlock,
        propertyId: filterProperty,
        status: filterStatus,
        searchTerm,
      };

      const response = await apiRequest("POST", "/api/reports/tenants/pdf", filters);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenants-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Tenants Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Tenant occupancy, lease tracking, and rental income analysis
            </p>
          </div>
        </div>
        <Button 
          onClick={handleExportPDF} 
          disabled={isExporting || filteredTenants.length === 0}
          data-testid="button-export-pdf"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </>
          )}
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tenants</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-total-tenants">{totalTenants}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600" data-testid="stat-active">{activeTenants}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expiring Soon</CardDescription>
            <CardTitle className="text-3xl text-orange-600" data-testid="stat-expiring">{expiringSoon}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Monthly Rent</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-monthly-rent">£{totalMonthlyRent.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search tenant or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>

            <div className="space-y-2">
              <Label>Block</Label>
              <Select value={filterBlock} onValueChange={setFilterBlock}>
                <SelectTrigger data-testid="select-block">
                  <SelectValue placeholder="All blocks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blocks</SelectItem>
                  {blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.unitNumber || property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon (60 days)</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Assignments ({filteredTenants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tenants">
              No tenants found matching your criteria
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Lease Start</TableHead>
                    <TableHead>Lease End</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                      <TableCell className="font-medium">
                        {tenant.tenantFirstName} {tenant.tenantLastName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tenant.tenantEmail || "N/A"}
                      </TableCell>
                      <TableCell>
                        {tenant.block ? (
                          <Link href={`/blocks/${tenant.block.id}`}>
                            <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" data-testid={`link-block-${tenant.id}`}>
                              <Building2 className="h-4 w-4" />
                              {tenant.block.name}
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            N/A
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.property ? (
                          <Link href={`/properties/${tenant.property.id}`}>
                            <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" data-testid={`link-property-${tenant.id}`}>
                              <Home className="h-4 w-4" />
                              {tenant.property.unitNumber || "View Property"}
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Home className="h-4 w-4" />
                            N/A
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.leaseStartDate ? (
                          format(new Date(tenant.leaseStartDate), 'MMM d, yyyy')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.leaseEndDate ? (
                          <div className="space-y-1">
                            <div>{format(new Date(tenant.leaseEndDate), 'MMM d, yyyy')}</div>
                            {tenant.daysUntilExpiry !== null && tenant.daysUntilExpiry >= 0 && (
                              <div className="text-xs text-muted-foreground">
                                {tenant.daysUntilExpiry} days left
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.monthlyRent > 0 ? (
                          <span className="font-medium">£{tenant.monthlyRent.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            tenant.status === "active" 
                              ? "default" 
                              : tenant.isExpiringSoon 
                              ? "outline" 
                              : "secondary"
                          }
                        >
                          {tenant.status === "active" && tenant.isExpiringSoon 
                            ? "Expiring Soon" 
                            : tenant.status === "active"
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
