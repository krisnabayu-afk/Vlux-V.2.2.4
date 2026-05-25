import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useCanEdit } from '../context/PermissionContext';
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Briefcase,
    Clock,
    CheckCircle2,
    MapPin,
    Trash2,
    Edit2,
    ExternalLink
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import {
    Card,
} from "../components/ui/card";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "../components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import WorkOrderDialog from '../components/fiberzone/WorkOrderDialog';

const API = `${process.env.REACT_APP_API_URL}/api`;

const STATUS_COLORS = {
    'Created': 'bg-blue-100 text-blue-700 border-blue-200',
    'On Progress': 'bg-[#9AD872]/20 text-[#76a15a] border-[#9AD872]/30',
    'Teknis Stage': 'bg-purple-100 text-purple-700 border-purple-200',
    'Done': 'bg-green-100 text-green-700 border-green-200',
};

export default function WorkOrders() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canEditPerm = useCanEdit('fiberzone');
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
        total_pages: 1
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedWO, setSelectedWO] = useState(null);

    const fetchWorkOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm,
                status: statusFilter !== 'all' ? statusFilter : undefined
            };
            const response = await axios.get(`${API}/work-orders`, { params });
            setWorkOrders(response.data.items);
            setPagination(prev => ({
                ...prev,
                total: response.data.total,
                total_pages: response.data.total_pages
            }));
        } catch (error) {
            toast.error("Failed to fetch Work Orders");
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

    useEffect(() => {
        fetchWorkOrders();
    }, [fetchWorkOrders]);

    const handleDeleteWO = async (woId) => {
        if (!window.confirm("Are you sure you want to delete this Work Order?")) return;
        try {
            await axios.delete(`${API}/work-orders/${woId}`);
            toast.success("Work Order deleted");
            fetchWorkOrders();
        } catch (error) {
            toast.error("Failed to delete Work Order");
        }
    };

    const handleUpdateStatus = async (woId, newStatus) => {
        try {
            await axios.put(`${API}/work-orders/${woId}`, { status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
            fetchWorkOrders();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="text-[#9AD872]" />
                        Fiberzone Work Orders
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage and track your Fiberzone service requests</p>
                </div>
                {canEditPerm && (
                <Button onClick={() => { setSelectedWO(null); setIsDialogOpen(true); }} className="bg-[#9AD872] hover:bg-[#8bc964] text-white font-bold shadow-lg shadow-[#9AD872]/20 border-b-4 border-[#76a15a] active:border-b-0 active:translate-y-1 transition-all">
                    <Plus className="mr-2 h-4 w-4" /> Create Work Order
                </Button>
                )}
            </div>

            <Card className="border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                            placeholder="Search by Ticket, Site, or Username..."
                            className="pl-10 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-white border-slate-200">
                                <Filter className="mr-2 h-4 w-4 text-slate-400" />
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="Created">Created</SelectItem>
                                <SelectItem value="On Progress">On Progress</SelectItem>
                                <SelectItem value="Teknis Stage">Teknis Stage</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-700">Ticket #</TableHead>
                            <TableHead className="font-semibold text-slate-700">Site</TableHead>
                            <TableHead className="font-semibold text-slate-700">Package</TableHead>
                            <TableHead className="font-semibold text-slate-700">Activity</TableHead>
                            <TableHead className="font-semibold text-slate-700">Username</TableHead>
                            <TableHead className="font-semibold text-slate-700">Status</TableHead>
                            <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                            <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    <Clock className="animate-spin inline mr-2 text-slate-400" />
                                    Loading work orders...
                                </TableCell>
                            </TableRow>
                        ) : workOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-slate-500 font-medium">
                                    No work orders found
                                </TableCell>
                            </TableRow>
                        ) : (
                            workOrders.map((wo) => (
                                <TableRow key={wo.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-bold">
                                        <div 
                                            className="text-[#76a15a] hover:underline cursor-pointer transition-colors flex items-center gap-2"
                                            onClick={() => navigate(`/fiberzone/work-orders/${wo.id}`)}
                                        >
                                            <Briefcase size={14} />
                                            {wo.ticket_number}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div 
                                            className="flex items-center gap-1.5 text-slate-600 hover:text-[#9AD872] cursor-pointer"
                                            onClick={() => navigate(`/fiberzone/sites/${wo.site_id}`)}
                                        >
                                            <MapPin size={14} className="text-slate-400" />
                                            {wo.site_name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                            {wo.package}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {wo.activity.map(act => (
                                                <Badge key={act} variant="secondary" className="text-[10px] py-0">
                                                    {act}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{wo.username_wo}</TableCell>
                                    <TableCell>
                                        {wo.assigned_to_name ? (
                                            <Badge variant="outline" className="bg-slate-50 text-[#76a15a] border-[#9AD872]/30 font-bold">
                                                {wo.assigned_to_name}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`font-semibold ${STATUS_COLORS[wo.status]}`}>
                                            {wo.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs text-nowrap">
                                        {new Date(wo.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {canEditPerm && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => { setSelectedWO(wo); setIsDialogOpen(true); }}>
                                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(wo.id, 'On Progress')}>
                                                    <Clock className="mr-2 h-4 w-4" /> Set On Progress
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(wo.id, 'Done')} className="text-green-600">
                                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Done
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteWO(wo.id)} className="text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                
                {pagination.total_pages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious 
                                        onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                        className={pagination.page === 1 ? "pointer-events-none opacity-50 cursor-pointer" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                                {[...Array(pagination.total_pages)].map((_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink 
                                            isActive={pagination.page === i + 1}
                                            onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
                                            className="cursor-pointer"
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext 
                                        onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.total_pages, p.page + 1) }))}
                                        className={pagination.page === pagination.total_pages ? "pointer-events-none opacity-50 cursor-pointer" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </Card>

            <WorkOrderDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                wo={selectedWO}
                onSuccess={fetchWorkOrders}
            />
        </div>
    );
}
