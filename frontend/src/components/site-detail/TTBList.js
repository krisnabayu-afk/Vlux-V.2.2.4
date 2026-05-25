import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { FileArchive, Download, Eye, Clock, User } from 'lucide-react';

export const TTBList = ({ ttbDocuments }) => {
    const handlePreview = (fileUrl) => {
        window.open(`${process.env.REACT_APP_API_URL}${fileUrl}`, '_blank');
    };

    const handleDownload = (fileUrl, fileName) => {
        const link = document.createElement('a');
        link.href = `${process.env.REACT_APP_API_URL}${fileUrl}`;
        link.download = fileName;
        link.target = '_blank';
        link.click();
    };

    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                    <FileArchive size={18} className="text-red-500" />
                    <CardTitle>TTB Documents</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {ttbDocuments.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border">
                        <FileArchive size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No TTB documents found for this site.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ttbDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                className="group p-4 bg-secondary/30 hover:bg-secondary/60 border border-border rounded-xl transition-all hover:shadow-md"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                        <FileArchive size={16} className="text-red-500" />
                                    </div>
                                </div>
                                <h4 className="font-bold text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-2 text-sm">
                                    {doc.title}
                                </h4>
                                <div className="space-y-1 mb-3">
                                    <div className="flex items-center text-[11px] text-muted-foreground">
                                        <User size={11} className="mr-1.5 shrink-0" />
                                        <span className="truncate">{doc.uploaded_by_name}</span>
                                    </div>
                                    <div className="flex items-center text-[11px] text-muted-foreground">
                                        <Clock size={11} className="mr-1.5 shrink-0" />
                                        {new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-3 border-t border-border/50">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(doc.file_url)}
                                        className="flex-1 h-7 text-[11px] border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                    >
                                        <Eye size={12} className="mr-1" />
                                        View
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(doc.file_url, doc.file_name)}
                                        className="flex-1 h-7 text-[11px] border-border hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30"
                                    >
                                        <Download size={12} className="mr-1" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
