import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface DashboardDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const DashboardDetailDialog: React.FC<DashboardDetailDialogProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          !w-[94vw]
          !max-w-[1400px]
          sm:!max-w-[1400px]
          md:!max-w-[1400px]
          lg:!max-w-[1400px]
          max-h-[88vh]
          p-0
          overflow-hidden
          rounded-3xl
          bg-white
        "
      >
        <div className="flex max-h-[88vh] w-full min-w-0 flex-col overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-black text-slate-900">
                  {title}
                </DialogTitle>

                {subtitle && (
                  <div className="mt-1 min-w-0 text-slate-400">
                    {subtitle}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="
                  flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-xl text-slate-400 transition
                  hover:bg-slate-100 hover:text-slate-700
                "
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div
            className="
              w-full
              min-w-0
              flex-1
              overflow-y-auto
              overflow-x-hidden
              px-6
              py-5
            "
          >
            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardDetailDialog;