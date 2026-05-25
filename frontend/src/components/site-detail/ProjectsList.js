import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FolderKanban, Download, ExternalLink, User, Calendar as CalendarIcon } from 'lucide-react';
import moment from 'moment';
import axios from 'axios';
import { toast } from 'sonner';

export const ProjectsList = ({ site, projects = [] }) => {
    const handleExportCsv = async () => {
        try {
            const API = `${process.env.REACT_APP_API_URL}/api`;
            const response = await axios.get(`${API}/projects/export/csv?site_id=${site.id}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Projects_${site.name.replace(/ /g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Projects exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export projects');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'Hold': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            case 'Finished': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                    <FolderKanban size={18} className="text-primary" />
                    <CardTitle>Site Projects</CardTitle>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2 text-xs border-primary/20 hover:bg-primary/10 hover:text-primary"
                    onClick={handleExportCsv}
                >
                    <Download size={14} /> Export CSV
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                {projects.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border">
                        <FolderKanban size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No projects found for this site.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Project Key & Name</th>
                                    <th className="px-4 py-3 font-medium">Sales Assigned</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Created Date</th>
                                    <th className="px-4 py-3 font-medium">Finished Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {projects.map((project) => (
                                    <tr key={project.id} className="hover:bg-secondary/20 transition-colors group">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <a 
                                                href={`/projects/${project.id}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex flex-col group/link"
                                            >
                                                <div className="flex items-center gap-1 text-primary font-bold hover:underline">
                                                    {project.key} <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                </div>
                                                <span className="text-foreground font-medium">{project.name}</span>
                                            </a>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <User size={12} />
                                                </div>
                                                <span className="text-foreground">{project.sales_user_name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge className={`${getStatusColor(project.status)} border-transparent shadow-none font-medium`}>
                                                {project.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <CalendarIcon size={12} />
                                                <span>{moment(project.created_at).format('DD MMM YYYY')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <CalendarIcon size={12} />
                                                <span>{project.finished_at ? moment(project.finished_at).format('DD MMM YYYY') : '-'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
