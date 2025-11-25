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
  Package, 
  ArrowLeft, 
  Filter,
  Loader2,
  Building2,
  Home
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function InventoryReport() {
  const { toast } = useToast();
  const [filterBlock, setFilterBlock] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCondition, setFilterCondition] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: assetInventory = [], isLoading: inventoryLoading } = useQuery<any[]>({
    queryKey: ["/api/asset-inventory"],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<any[]>({
    queryKey: ["/api/blocks"],
  });

  const isLoading = inventoryLoading || propertiesLoading || blocksLoading;

  // Enrich inventory data with property and block information
  const enrichedInventory = useMemo(() => {
    return assetInventory.map(asset => {
      const property = properties.find(p => p.id === asset.propertyId);
      const block = property ? blocks.find(b => b.id === property.blockId) : 
                    blocks.find(b => b.id === asset.blockId);

      return {
        ...asset,
        property,
        block,
      };
    });
  }, [assetInventory, properties, blocks]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    enrichedInventory.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [enrichedInventory]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    let filtered = enrichedInventory;

    if (filterBlock !== "all") {
      filtered = filtered.filter(i => 
        i.blockId === filterBlock || i.property?.blockId === filterBlock
      );
    }

    if (filterProperty !== "all") {
      filtered = filtered.filter(i => i.propertyId === filterProperty);
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(i => i.category === filterCategory);
    }

    if (filterCondition !== "all") {
      filtered = filtered.filter(i => i.condition === filterCondition);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(i => 
        i.name?.toLowerCase().includes(searchLower) ||
        i.description?.toLowerCase().includes(searchLower) ||
        i.serialNumber?.toLowerCase().includes(searchLower) ||
        i.location?.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => {
      // Sort by block, then property, then category, then name
      const blockCompare = (a.block?.name || "").localeCompare(b.block?.name || "");
      if (blockCompare !== 0) return blockCompare;
      
      const propertyCompare = (a.property?.unitNumber || "").localeCompare(b.property?.unitNumber || "");
      if (propertyCompare !== 0) return propertyCompare;
      
      const categoryCompare = (a.category || "").localeCompare(b.category || "");
      if (categoryCompare !== 0) return categoryCompare;
      
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [enrichedInventory, filterBlock, filterProperty, filterCategory, filterCondition, searchTerm]);

  // Summary statistics
  const totalAssets = filteredInventory.length;
  const blockAssets = filteredInventory.filter(i => i.blockId && !i.propertyId).length;
  const propertyAssets = filteredInventory.filter(i => i.propertyId).length;
  const damagedAssets = filteredInventory.filter(i => 
    i.condition === "poor" || i.condition === "damaged"
  ).length;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const filters = {
        blockId: filterBlock,
        propertyId: filterProperty,
        category: filterCategory,
        condition: filterCondition,
        searchTerm,
      };

      const response = await apiRequest("POST", "/api/reports/inventory/pdf", filters);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
              <Package className="h-8 w-8 text-primary" />
              Inventory Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Asset tracking and inventory management across blocks and properties
            </p>
          </div>
        </div>
        <Button 
          onClick={handleExportPDF} 
          disabled={isExporting || filteredInventory.length === 0}
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
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-total-assets">{totalAssets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Block Assets</CardDescription>
            <CardTitle className="text-3xl text-primary" data-testid="stat-block-assets">{blockAssets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Property Assets</CardDescription>
            <CardTitle className="text-3xl text-accent" data-testid="stat-property-assets">{propertyAssets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs Attention</CardDescription>
            <CardTitle className="text-3xl text-destructive" data-testid="stat-needs-attention">{damagedAssets}</CardTitle>
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
                placeholder="Search assets..."
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
              <Label>Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger data-testid="select-condition">
                  <SelectValue placeholder="All conditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Inventory ({filteredInventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-inventory">
              No inventory items found matching your criteria
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((asset) => (
                    <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                      <TableCell className="font-medium">
                        {asset.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {asset.category || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {asset.location || "N/A"}
                      </TableCell>
                      <TableCell>
                        {asset.block ? (
                          <Link href={`/blocks/${asset.block.id}`}>
                            <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" data-testid={`link-block-${asset.id}`}>
                              <Building2 className="h-4 w-4" />
                              {asset.block.name}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {asset.property ? (
                          <Link href={`/properties/${asset.property.id}`}>
                            <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer" data-testid={`link-property-${asset.id}`}>
                              <Home className="h-4 w-4" />
                              {asset.property.unitNumber}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            asset.condition === "excellent" || asset.condition === "good"
                              ? "default"
                              : asset.condition === "fair"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {asset.condition || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {asset.serialNumber || "-"}
                      </TableCell>
                      <TableCell>
                        {asset.createdAt ? (
                          format(new Date(asset.createdAt), 'MMM d, yyyy')
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
