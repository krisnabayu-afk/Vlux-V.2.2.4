import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import { 
    Zap, 
    Briefcase, 
    Users, 
    ChevronRight, 
    ExternalLink,
    Clock,
    CheckCircle2,
    MapPin,
    ArrowRight,
    Calendar,
    User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_API_URL}/api`;

const STATUS_COLORS = {
    'Created': 'bg-blue-100 text-blue-700 border-blue-200',
    'On Progress': 'bg-[#9AD872]/20 text-[#76a15a] border-[#9AD872]/30',
    'Teknis Stage': 'bg-purple-100 text-purple-700 border-purple-200',
    'Done': 'bg-green-100 text-green-700 border-green-200',
};

export default function FiberzoneDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        active_wo_count: 0,
        total_fiberzone_clients: 0,
        active_wo_list: [],
        today_schedules: [],
        today_schedule_count: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/fiberzone/dashboard`);
            setStats(response.data);
        } catch (error) {
            toast.error("Failed to fetch Fiberzone dashboard stats");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#9AD872] to-[#8bc964] p-8 rounded-2xl shadow-lg text-white">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <Zap className="fill-white" size={32} />
                        Fiberzone Control Center
                    </h1>
                    <p className="text-white/80 font-medium font-sans">Monitoring and managing specialized fiberzone connectivity</p>
                </div>
                <Link to="/fiberzone/work-orders">
                    <Button className="bg-white text-[#76a15a] hover:bg-slate-50 font-bold px-6 h-12 rounded-xl flex items-center gap-2 shadow-inner">
                        Manage All Work Orders
                        <ArrowRight size={18} />
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#9AD872]" />
                    <CardHeader className="pb-2">
                        <CardDescription className="font-semibold uppercase tracking-wider text-slate-400 text-xs">Active Work Orders</CardDescription>
                        <CardTitle className="text-4xl font-black text-slate-800">{stats.active_wo_count}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Clock size={16} className="text-[#9AD872]" />
                            Ongoing technical activities
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                    <CardHeader className="pb-2">
                        <CardDescription className="font-semibold uppercase tracking-wider text-slate-400 text-xs">Fiberzone Clients</CardDescription>
                        <CardTitle className="text-4xl font-black text-slate-800">{stats.total_fiberzone_clients}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Users size={16} className="text-blue-500" />
                            Total verified sites
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white overflow-hidden relative cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/fiberzone/schedule')}>
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                    <CardHeader className="pb-2">
                        <CardDescription className="font-semibold uppercase tracking-wider text-slate-400 text-xs">Today's Schedules</CardDescription>
                        <CardTitle className="text-4xl font-black text-slate-800">{stats.today_schedule_count || 0}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Calendar size={16} className="text-amber-500" />
                            Assigned for today
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Schedule Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-[#9AD872]" size={20} />
                        Today's Schedule
                    </h2>
                    <Link to="/fiberzone/schedule" className="text-[#76a15a] hover:text-[#65884a] text-sm font-semibold flex items-center gap-1 group">
                        View Full Calendar
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <Card className="border-slate-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <div className="w-8 h-8 border-4 border-[#9AD872] border-t-transparent rounded-full animate-spin mb-3" />
                            Loading schedules...
                        </div>
                    ) : (stats.today_schedules || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <Calendar size={36} className="mb-3 text-slate-300" />
                            <p className="font-medium">No schedules for today</p>
                            <p className="text-xs mt-1">Create one from the Schedule page</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {(stats.today_schedules || []).map((sched) => (
                                <div key={sched.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${sched.status === 'Finished' ? 'bg-green-100' : 'bg-[#9AD872]/15'}`}>
                                            {sched.status === 'Finished' 
                                                ? <CheckCircle2 size={18} className="text-green-600" />
                                                : <Clock size={18} className="text-[#9AD872]" />
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 text-sm truncate">{sched.title}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <MapPin size={11} className="text-[#9AD872]" />
                                                    {sched.site_name}
                                                </span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <User size={11} className="text-[#9AD872]" />
                                                    {sched.user_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                        <span className="text-xs text-slate-400 font-mono">
                                            {moment(sched.start_time).format('HH:mm')} — {moment(sched.end_time).format('HH:mm')}
                                        </span>
                                        <Badge className={`text-[10px] font-bold ${sched.status === 'Finished' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {sched.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Active Work Orders Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="text-[#9AD872]" size={20} />
                        Recent Active Work Orders
                    </h2>
                    <Link to="/fiberzone/work-orders" className="text-[#76a15a] hover:text-[#65884a] text-sm font-semibold flex items-center gap-1 group">
                        View Full List
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <Card className="border-slate-100 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Ticket</TableHead>
                                <TableHead className="font-semibold text-slate-700">Site</TableHead>
                                <TableHead className="font-semibold text-slate-700">Activity</TableHead>
                                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-[#9AD872] border-t-transparent rounded-full animate-spin" />
                                            Loading activities...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : stats.active_wo_list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-slate-500 italic">
                                        No active work orders at the moment.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stats.active_wo_list.map((wo) => (
                                    <TableRow key={wo.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-bold text-slate-900">
                                            <div 
                                                className="hover:text-[#9AD872] cursor-pointer"
                                                onClick={() => navigate(`/fiberzone/work-orders/${wo.id}`)}
                                            >
                                                {wo.ticket_number}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700 hover:text-[#9AD872] cursor-pointer" onClick={() => navigate(`/fiberzone/sites/${wo.site_id}`)}>{wo.site_name}</span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 uppercase tracking-tighter">
                                                    <MapPin size={10} /> {wo.pop || 'N/A'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {wo.activity.slice(0, 2).map(act => (
                                                    <Badge key={act} variant="outline" className="text-[9px] py-0 border-slate-200 text-slate-500 font-normal">
                                                        {act}
                                                    </Badge>
                                                ))}
                                                {wo.activity.length > 2 && <span className="text-[9px] text-slate-400">+{wo.activity.length - 2}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[wo.status]}`}>
                                                {wo.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-slate-500 text-xs">
                                            {new Date(wo.created_at).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
}
