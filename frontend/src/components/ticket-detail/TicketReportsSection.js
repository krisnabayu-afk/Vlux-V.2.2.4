import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileText, Plus, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TicketReportsSection = ({ 
    reports, 
    onUploadReport, 
    onViewReport,
    getStatusColor 
}) => {
    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="text-primary" size={20} />
                    <span>Reports</span>
                </CardTitle>
                <Button 
                    onClick={onUploadReport} 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    data-testid="upload-report-ticket-button"
                >
                    <Plus size={16} className="mr-1" />
                    Upload Report
                </Button>
            </CardHeader>
            <CardContent>
                {reports.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                        <p className="text-muted-foreground text-sm">No reports linked to this ticket yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reports.map((report) => (
                            <div 
                                key={report.id} 
                                className="p-4 border border-border rounded-lg bg-slate-50 dark:bg-slate-900/40 hover:border-primary/30 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-foreground text-sm line-clamp-1">{report.title}</h4>
                                    <Badge className={getStatusColor(report.status)}>
                                        {report.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                    {report.description || 'No description provided.'}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(report.created_at).toLocaleDateString()}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-primary px-2"
                                            onClick={() => onViewReport(report.id)}
                                        >
                                            <ExternalLink size={12} className="mr-1" />
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
