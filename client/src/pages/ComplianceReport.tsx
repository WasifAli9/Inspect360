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
  ShieldCheck, 
  ArrowLeft, 
  Filter,
  Loader2,
  Building2,
  Home,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Link } from "wouter";
import { format, differenceInDays, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ComplianceReport() {
  const { toast } = useToast();
  const [filterBlock, setFilterBlock] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: complianceDocuments = [], isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/compliance"],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<any[]>({
    queryKey: ["/api/blocks"],
  });

  const isLoading = documentsLoading || propertiesLoading || blocksLoading;

  // Get unique document types
  const documentTypes = useMemo(() => {
    const types = new Set<string>();
    complianceDocuments.forEach(doc => {
      if (doc.documentType) types.add(doc.documentType);
    });
    return Array.from(types).sort();
  }, [complianceDocuments]);

  // Enrich documents with property and block information
  const enrichedDocuments = useMemo(() => {
    return complianceDocuments.map(doc => {
      const property = properties.find(p => p.id === doc.propertyId);
      const block = property ? blocks.find(b => b.id === property.blockId) : 
                    blocks.find(b => b.id === doc.blockId);

      let status = "current";
      let daysUntilExpiry = null;

      if (doc.expiryDate) {
        const expiryDate = new Date(doc.expiryDate);
        daysUntilExpiry = differenceInDays(expiryDate, new Date());
        
        if (isPast(expiryDate)) {
          status = "expired";
        } else if (daysUntilExpiry <= 30) {
          status = "expiring-soon";
        } else {
          status = "current";
        }
      }

      return {
        ...doc,
        property,
        block,
        status,
        daysUntilExpiry,
      };
    });
  }, [complianceDocuments, properties, blocks]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    let filtered = enrichedDocuments;

    if (filterBlock !== "all") {
      filtered = filtered.filter(d => 
        d.blockId === filterBlock || d.property?.blockId === filterBlock
      );
    }

    if (filterProperty !== "all") {
      filtered = filtered.filter(d => d.propertyId === filterProperty);
    }

    if (filterType !== "all") {
      filtered = filtered.filter(d => d.documentType === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.documentType?.toLowerCase().includes(searchLower) ||
        d.property?.address?.toLowerCase().includes(searchLower) ||
        d.property?.unitNumber?.toLowerCase().includes(searchLower) ||
        d.block?.name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => {
      // Sort by status (expired first, then expiring soon, then current), then by expiry date
      const statusOrder = { "expired": 0, "expiring-soon": 1, "current": 2 };
      const statusCompare = statusOrder[a.status as keyof typeof statusOrder] - 
                           statusOrder[b.status as keyof typeof statusOrder];
      if (statusCompare !== 0) return statusCompare;

      // Then by expiry date
      if (a.expiryDate && b.expiryDate) {
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      if (a.expiryDate) return -1;
      if (b.expiryDate) return 1;
      
      // Finally by document type
      return (a.documentType || "").localeCompare(b.documentType || "");
    });
  }, [enrichedDocuments, filterBlock, filterProperty, filterType, filterStatus, searchTerm]);

  // Summary statistics
  const totalDocuments = filteredDocuments.length;
  const currentDocuments = filteredDocuments.filter(d => d.status === "current").length;
  const expiringSoon = filteredDocuments.filter(d => d.status === "expiring-soon").length;
  const expired = filteredDocuments.filter(d => d.status === "expired").length;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const filters = {
        blockId: filterBlock,
        propertyId: filterProperty,
        documentType: filterType,
        status: filterStatus,
        searchTerm,
      };

      const response = await apiRequest("POST", "/api/reports/compliance/pdf", filters);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
              <ShieldCheck className="h-8 w-8 text-primary" />
              Compliance Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Document tracking and compliance management by block and property
            </p>
          </div>
        </div>
        <Button 
          onClick={handleExportPDF} 
          disabled={isExporting || filteredDocuments.length === 0}
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
            <CardDescription>Total Documents</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-total-documents">{totalDocuments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current</CardDescription>
            <CardTitle className="text-3xl text-green-600" data-testid="stat-current">{currentDocuments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expiring Soon</CardDescription>
            <CardTitle className="text-3xl text-orange-600" data-testid="stat-expiring-soon">{expiringSoon}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expired</CardDescription>
            <CardTitle className="text-3xl text-destructive" data-testid="stat-expired">{expired}</CardTitle>
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
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search documents..."
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
              <Label>Document Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="expiring-soon">Expiring Soon (30 days)</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-documents">
              No compliance documents found matching your criteria
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                      <TableCell className="font-medium">
                        {doc.documentType}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {doc.blockId && !doc.propertyId ? "Block-Level" : "Property-Level"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.block ? (
                          <Link href={`/blocks/${doc.block.id}`}>
                            <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" data-testid={`link-block-${doc.id}`}>
                              <Building2 className="h-4 w-4" />
                              {doc.block.name}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.property ? (
                          <Link href={`/properties/${doc.property.id}`}>
                            <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" data-testid={`link-property-${doc.id}`}>
                              <Home className="h-4 w-4" />
                              {doc.property.unitNumber}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.expiryDate ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
                            </div>
                            {doc.daysUntilExpiry !== null && doc.daysUntilExpiry >= 0 && (
                              <div className="text-xs text-muted-foreground">
                                {doc.daysUntilExpiry} days left
                              </div>
                            )}
                            {doc.daysUntilExpiry !== null && doc.daysUntilExpiry < 0 && (
                              <div className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {Math.abs(doc.daysUntilExpiry)} days overdue
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            doc.status === "expired" 
                              ? "destructive" 
                              : doc.status === "expiring-soon" 
                              ? "outline" 
                              : "default"
                          }
                        >
                          {doc.status === "expired" 
                            ? "Expired" 
                            : doc.status === "expiring-soon"
                            ? "Expiring Soon"
                            : "Current"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.createdAt ? (
                          format(new Date(doc.createdAt), 'MMM d, yyyy')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
