import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Calendar, Download, User, Briefcase, Info, BadgeCheck } from 'lucide-react';
import moment from 'moment';
import axios from 'axios';
import { toast } from 'sonner';

export const SchedulesList = ({ site, schedules = [] }) => {
    const handleExportCsv = async () => {
        try {
            const API = `${process.env.REACT_APP_API_URL}/api`;
            const response = await axios.get(`${API}/schedules/export?site_id=${site.id}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Schedules_${site.name.replace(/ /g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Schedules exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export schedules');
        }
    };

    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-primary" />
                    <CardTitle>Site Schedules</CardTitle>
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
                {schedules.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border">
                        <Calendar size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No schedules found for this site.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 rounded-t-lg">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Date & Time</th>
                                    <th className="px-4 py-3 font-medium">Person</th>
                                    <th className="px-4 py-3 font-medium">Title/Purpose</th>
                                    <th className="px-4 py-3 font-medium">Product</th>
                                    <th className="px-4 py-3 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {schedules.map((schedule) => (
                                    <tr key={schedule.id} className="hover:bg-secondary/20 transition-colors group">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">
                                                    {moment(schedule.start_date).format('DD MMM YYYY')}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {moment(schedule.start_date).format('HH:mm')} - {schedule.end_date ? moment(schedule.end_date).format('HH:mm') : '??:??'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <User size={12} />
                                                </div>
                                                <span className="text-foreground font-medium">{schedule.user_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-foreground font-medium">{schedule.title}</span>
                                                {schedule.category_name && (
                                                    <span className="text-[10px] text-muted-foreground">{schedule.category_name}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <Briefcase size={12} className="text-muted-foreground" />
                                                <span className={schedule.type === 'Fiberzone' ? 'text-orange-500 font-bold' : 'text-blue-500 font-bold'}>
                                                    {schedule.product || schedule.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                schedule.status === 'Finished' || schedule.status === 'Done' 
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {schedule.status === 'Finished' || schedule.status === 'Done' ? <BadgeCheck size={10} /> : <Info size={10} />}
                                                {schedule.status || 'Scheduled'}
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
