import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { X, FileText, Eye } from 'lucide-react';

const PDFPreviewDialog = ({ open, onOpenChange, fileUrl, fileName }) => {
    if (!fileUrl) return null;

    // Append #toolbar=0 to hide the toolbar in many browser PDF viewers
    const fullUrl = `${process.env.REACT_APP_API_URL || ''}${fileUrl}${fileUrl.includes('#') ? '' : '#toolbar=0'}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-w-[95vw] h-[95vh] flex flex-col p-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 [&>button]:hidden text-slate-800 dark:text-slate-200" 
                data-testid="pdf-preview-dialog" 
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText size={20} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-slate-200">{fileName}</h3>
                            <p className="text-xs text-slate-500">Document Preview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 bg-slate-100 dark:bg-slate-900 relative flex flex-col overflow-hidden">
                    <iframe
                        src={fullUrl}
                        className="w-full h-full border-none"
                        title={fileName}
                    />
                    
                    {/* Optional overlay to discourage right-click on the iframe area */}
                    <div 
                        className="absolute inset-0 pointer-events-none" 
                        style={{ background: 'transparent' }}
                        onContextMenu={(e) => e.preventDefault()}
                    />
                </div>
                
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Eye size={12} /> Preview Mode Only
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PDFPreviewDialog;
