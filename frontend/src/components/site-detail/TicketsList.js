import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Ticket as TicketIcon, Clock, ChevronRight, ChevronsUpDown, Download, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

export const TicketsList = ({ site, tickets, getPriorityColor, getStatusColor, sortBy, setSortBy }) => {
    const getCategoryColor = (category) => {
        const colors = {
          'FOKMON': 'bg-slate-500 text-white',
          'MAINTENANCE': 'bg-blue-500 text-white',
          'WO BOD/UPGRADE': 'bg-purple-500 text-white',
          'FYI': 'bg-cyan-500 text-white',
          'DOWN': 'bg-red-500 text-white',
          'RFO': 'bg-orange-500 text-white',
          'FIBERZONE': 'bg-indigo-500 text-white',
          'VLEPO': 'bg-teal-500 text-white',
          'FTTR': 'bg-rose-500 text-white',
          'MEGALOS': 'bg-amber-500 text-white',
          'EMAIL': 'bg-sky-500 text-white',
          'INTERNET': 'bg-emerald-500 text-white',
          'ACCESS POINT': 'bg-violet-500 text-white',
          'VIRTUAL': 'bg-fuchsia-500 text-white',
          'DEVICE': 'bg-lime-600 text-white',
          'REPORT': 'bg-zinc-500 text-white',
          'REQUEST CLIENT': 'bg-pink-500 text-white'
        };
        return colors[category] || 'bg-muted/30 border-border text-foreground';
    };

    return (
        <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                    <TicketIcon size={18} className="text-primary" />
                    <CardTitle>Site Tickets</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-2 text-xs border-primary/20 hover:bg-primary/10 hover:text-primary"
                        onClick={async () => {
                            try {
                                const API = `${process.env.REACT_APP_API_URL}/api`;
                                const response = await axios({
                                    url: `${API}/tickets/export/csv?site_id=${site.id}`,
                                    method: 'GET',
                                    responseType: 'blob',
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `Tickets_${site.name.replace(/ /g, '_')}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                            } catch (error) {
                                console.error('Export failed:', error);
                            }
                        }}
                    >
                        <Download size={14} /> Export CSV
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                        <ChevronsUpDown size={14} /> Sort By:
                    </div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[140px] h-8 text-xs bg-secondary/50 border-border">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="priority">High Priority</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {tickets.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/20 m-6 rounded-xl border border-dashed border-border">
                        <TicketIcon size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No tickets found for this site.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="border-b border-border">
                                    <TableHead className="w-[150px] text-muted-foreground font-medium">Ticket Number</TableHead>
                                    <TableHead className="text-muted-foreground font-medium">Description</TableHead>
                                    <TableHead className="w-[200px] text-muted-foreground font-medium">Next Action</TableHead>
                                    <TableHead className="w-[120px] text-muted-foreground font-medium text-center">Category</TableHead>
                                    <TableHead className="w-[150px] text-muted-foreground font-medium text-center">Date</TableHead>
                                    <TableHead className="w-[120px] text-muted-foreground font-medium text-center pr-6">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="border-b border-border group transition-colors hover:bg-muted/30">
                                        {/* Column 1: Ticket Number */}
                                        <TableCell>
                                            {ticket.link ? (
                                                <a 
                                                    href={ticket.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-500 hover:underline font-bold"
                                                >
                                                    {ticket.ticket_number || 'View Link'}
                                                </a>
                                            ) : (
                                                <span className="text-foreground font-medium">{ticket.ticket_number || '-'}</span>
                                            )}
                                        </TableCell>

                                        {/* Column 2: Description (Clickable to Detail) */}
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link
                                                            to={`/tickets/${ticket.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group/desc block"
                                                        >
                                                            <div className="flex flex-col">
                                                                <p className="text-sm font-medium text-foreground group-hover/desc:text-primary transition-colors line-clamp-1">
                                                                    {ticket.description}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[400px] p-4 bg-popover border border-border shadow-2xl">
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-bold text-primary flex items-center gap-2">
                                                                <MessageSquare size={12} /> Full Description
                                                            </p>
                                                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                                                {ticket.description}
                                                            </p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>

                                        {/* Column 3: Next Action */}
                                        <TableCell className="text-foreground max-w-[200px]">
                                            {ticket.latest_comment ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-2 cursor-help group/comment">
                                                                <MessageSquare size={14} className="text-muted-foreground shrink-0 group-hover/comment:text-primary transition-colors" />
                                                                <p className="text-xs truncate">
                                                                    {ticket.latest_comment}
                                                                </p>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-[300px] p-3 bg-popover border border-border shadow-xl">
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-bold text-primary flex items-center gap-1">
                                                                    <MessageSquare size={10} /> Latest Comment
                                                                </p>
                                                                <p className="text-sm leading-relaxed text-foreground">
                                                                    {ticket.latest_comment}
                                                                </p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-muted-foreground/40 text-[10px] italic">No actions recorded</span>
                                            )}
                                        </TableCell>

                                        {/* Column 4: Category */}
                                        <TableCell className="text-center">
                                            {ticket.category ? (
                                                <Badge variant="outline" className={cn("border-transparent font-medium text-[10px] px-2 whitespace-nowrap", getCategoryColor(ticket.category))}>
                                                    {ticket.category}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>

                                        {/* Column 5: Date */}
                                        <TableCell className="text-center text-muted-foreground whitespace-nowrap">
                                            <div className="text-[10px]">{new Date(ticket.created_at).toLocaleDateString()}</div>
                                            <div className="text-[9px] opacity-70">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </TableCell>

                                        {/* Column 6: Status */}
                                        <TableCell className="text-center pr-6">
                                            <Badge className={cn("min-w-[80px] justify-center shadow-none text-[10px] py-0 h-5", getStatusColor(ticket.status))}>
                                                {ticket.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
