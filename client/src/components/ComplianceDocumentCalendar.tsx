import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Circle, FileText } from "lucide-react";

interface ComplianceDocument {
  id: string;
  documentType: string;
  expiryDate: string | null;
  documentUrl: string;
  createdAt: string;
}

interface ComplianceDocumentCalendarProps {
  documents: ComplianceDocument[];
  isLoading: boolean;
  entityType: 'property' | 'block';
}

type DocumentStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';

interface DocumentTypeData {
  documentType: string;
  monthData: MonthData[];
  status: DocumentStatus;
  expiryDate: string | null;
}

interface MonthData {
  month: string;
  status: DocumentStatus;
  hasDocument: boolean;
}

function getDocumentStatus(expiryDate: string | null): DocumentStatus {
  if (!expiryDate) return 'no_expiry';
  
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
}

function StatusCell({ data }: { data: MonthData }) {
  const getStatusIcon = () => {
    if (!data.hasDocument) {
      return <Circle className="h-4 w-4 text-muted-foreground/30" />;
    }
    switch (data.status) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'expiring_soon':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'no_expiry':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground/30" />;
    }
  };

  const getStatusColor = () => {
    if (!data.hasDocument) {
      return 'bg-muted/30 border-border/30';
    }
    switch (data.status) {
      case 'valid':
        return 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800';
      case 'expired':
        return 'bg-destructive/10 border-destructive/30';
      case 'expiring_soon':
        return 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800';
      case 'no_expiry':
        return 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-muted/30 border-border/30';
    }
  };

  return (
    <div 
      className={`flex items-center justify-center p-2 rounded-md border ${getStatusColor()} transition-all`}
      title={data.hasDocument ? `${data.month}: ${data.status.replace('_', ' ')}` : `${data.month}: No document`}
    >
      {getStatusIcon()}
    </div>
  );
}

export default function ComplianceDocumentCalendar({ documents, isLoading, entityType }: ComplianceDocumentCalendarProps) {
  const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Annual Compliance Schedule</CardTitle>
          <CardDescription>Loading compliance documents...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Annual Compliance Schedule</CardTitle>
          <CardDescription>
            Track compliance document expiry dates for {entityType === 'property' ? 'this property' : 'this block'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Compliance Documents</h3>
            <p className="text-muted-foreground">
              Upload compliance documents to track their expiry dates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const documentsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.documentType]) {
      acc[doc.documentType] = [];
    }
    acc[doc.documentType].push(doc);
    return acc;
  }, {} as Record<string, ComplianceDocument[]>);

  const documentTypeData: DocumentTypeData[] = Object.entries(documentsByType).map(([docType, docs]) => {
    const latestDoc = docs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    const status = getDocumentStatus(latestDoc.expiryDate);
    const expiryMonth = latestDoc.expiryDate ? new Date(latestDoc.expiryDate).getMonth() : null;
    const expiryYear = latestDoc.expiryDate ? new Date(latestDoc.expiryDate).getFullYear() : null;
    
    const monthData: MonthData[] = monthAbbreviations.map((month, idx) => {
      const isExpiryMonth = expiryYear === currentYear && expiryMonth === idx;
      const isPastMonth = idx < currentMonth && expiryYear === currentYear;
      const hasDocument = latestDoc.expiryDate 
        ? (expiryYear && expiryYear > currentYear) || (expiryYear === currentYear && idx <= (expiryMonth ?? 11))
        : true;
      
      let monthStatus: DocumentStatus = 'no_expiry';
      if (latestDoc.expiryDate) {
        if (isExpiryMonth) {
          monthStatus = status;
        } else if (hasDocument && status !== 'expired') {
          monthStatus = 'valid';
        } else if (status === 'expired' && isPastMonth) {
          monthStatus = 'expired';
        } else if (!hasDocument) {
          monthStatus = 'expired';
        }
      }
      
      return {
        month,
        status: monthStatus,
        hasDocument: hasDocument || !latestDoc.expiryDate,
      };
    });
    
    return {
      documentType: docType,
      monthData,
      status,
      expiryDate: latestDoc.expiryDate,
    };
  });

  const validCount = documentTypeData.filter(d => d.status === 'valid' || d.status === 'no_expiry').length;
  const expiringCount = documentTypeData.filter(d => d.status === 'expiring_soon').length;
  const expiredCount = documentTypeData.filter(d => d.status === 'expired').length;
  const overallCompliance = documents.length > 0 
    ? Math.round((validCount / documentTypeData.length) * 100) 
    : 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Annual Compliance Schedule
              <Badge variant="outline" className="ml-2" data-testid="badge-compliance-overall">
                {overallCompliance}% Compliant
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {currentYear} · {documentTypeData.length} document type(s) tracked
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">Valid ({validCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">Expired ({expiredCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-muted-foreground">Expiring Soon ({expiringCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-muted-foreground/30" />
            <span className="text-muted-foreground">No Document</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '200px repeat(12, 1fr) 100px' }}>
              <div className="font-semibold text-sm p-2">Document Type</div>
              {monthAbbreviations.map((month) => (
                <div key={month} className="font-semibold text-sm text-center p-2">
                  {month}
                </div>
              ))}
              <div className="font-semibold text-sm text-center p-2">Status</div>
            </div>

            {documentTypeData.map((docType) => (
              <div 
                key={docType.documentType} 
                className="grid gap-2 mb-2 items-center"
                style={{ gridTemplateColumns: '200px repeat(12, 1fr) 100px' }}
              >
                <div className="text-sm font-medium p-2 truncate" title={docType.documentType}>
                  {docType.documentType}
                </div>

                {docType.monthData.map((monthData) => (
                  <StatusCell key={monthData.month} data={monthData} />
                ))}

                <div className="text-center p-2">
                  <Badge 
                    variant={
                      docType.status === 'valid' || docType.status === 'no_expiry' ? 'default' :
                      docType.status === 'expiring_soon' ? 'secondary' :
                      'destructive'
                    }
                    className={docType.status === 'valid' || docType.status === 'no_expiry' ? 'bg-green-600' : ''}
                  >
                    {docType.status === 'no_expiry' ? 'Valid' : docType.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-6 border-t mt-6">
          <div>
            <div className="text-sm text-muted-foreground">Total Documents</div>
            <div className="text-2xl font-bold">{documents.length}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Valid</div>
            <div className="text-2xl font-bold text-green-600">{validCount}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Attention Needed</div>
            <div className="text-2xl font-bold text-destructive">{expiringCount + expiredCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
