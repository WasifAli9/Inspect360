import { Pen } from "lucide-react";
import { Link } from "wouter";

interface ActionRequiredBannerProps {
  reportId: string;
  message: string;
}

export function ActionRequiredBanner({ reportId, message }: ActionRequiredBannerProps) {
  return (
    <Link href={`/tenant/comparison-reports/${reportId}`}>
      <div className="w-full rounded-lg border border-orange-500 bg-[#FFF8E7] p-4 cursor-pointer hover:bg-[#FFF5D6] transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Pen className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-orange-600 text-base leading-tight">Action Required</h3>
            <p className="text-sm text-orange-600 leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

