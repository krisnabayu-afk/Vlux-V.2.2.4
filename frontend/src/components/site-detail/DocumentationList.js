import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { BookOpen, Download, Eye, Clock, User, Plus, ImageIcon } from 'lucide-react';

export const DocumentationList = ({ documentationDocuments, onUploadClick }) => {
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
                    <ImageIcon size={18} className="text-blue-500" />
                    <CardTitle>Site Images</CardTitle>
                </div>
                {onUploadClick && (
                    <Button onClick={onUploadClick} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                        <Plus size={16} className="mr-1" />
                        Upload
                    </Button>
                )}
            </CardHeader>
            <CardContent className="pt-6">
                {!documentationDocuments || documentationDocuments.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border">
                        <ImageIcon size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No images found for this site.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documentationDocuments.map((doc) => {
                            const isImage = doc.file_url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
                            return (
                                <div
                                    key={doc.id}
                                    className="group relative rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all flex flex-col"
                                >
                                    <div className="aspect-video w-full bg-secondary/10 relative border-b border-border">
                                        {isImage ? (
                                            <img 
                                                src={`${process.env.REACT_APP_API_URL}${doc.file_url}`} 
                                                alt={doc.title} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                                <BookOpen size={32} className="text-blue-500 mb-2 opacity-50" />
                                                <span className="text-xs text-muted-foreground text-center line-clamp-2">{doc.file_name}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <Button 
                                                variant="secondary" 
                                                size="icon" 
                                                className="h-9 w-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-black border-0 backdrop-blur-sm transition-all" 
                                                onClick={() => handlePreview(doc.file_url)}
                                                title="View Image"
                                            >
                                                <Eye size={16} />
                                            </Button>
                                            <Button 
                                                variant="secondary" 
                                                size="icon" 
                                                className="h-9 w-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-black border-0 backdrop-blur-sm transition-all" 
                                                onClick={() => handleDownload(doc.file_url, doc.file_name)}
                                                title="Download Image"
                                            >
                                                <Download size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card flex-1 flex flex-col justify-center">
                                        <h4 className="font-bold text-sm text-foreground truncate mb-1" title={doc.title}>
                                            {doc.title}
                                        </h4>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span className="flex items-center min-w-0" title={doc.uploaded_by_name}>
                                                <User size={10} className="mr-1 shrink-0" />
                                                <span className="truncate">{doc.uploaded_by_name}</span>
                                            </span>
                                            <span className="flex items-center shrink-0 ml-2">
                                                <Clock size={10} className="mr-1" />
                                                {new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
