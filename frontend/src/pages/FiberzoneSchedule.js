import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
    Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Clock, CheckCircle, MapPin, User, Zap, Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import CreateFiberzoneScheduleDialog from '../components/fiberzone/CreateFiberzoneScheduleDialog';
import EditFiberzoneScheduleDialog from '../components/fiberzone/EditFiberzoneScheduleDialog';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);
const API = `${process.env.REACT_APP_API_URL}/api`;

// Custom toolbar with Fiberzone green theme
const FiberzoneToolbar = ({ label, onNavigate, onView, view }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate('PREV')} className="h-8 w-8 p-0">
                <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')} className="h-8 text-xs font-medium">
                Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('NEXT')} className="h-8 w-8 p-0">
                <ChevronRight size={16} />
            </Button>
            <h2 className="text-lg font-bold text-slate-800 ml-2">{label}</h2>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {['month', 'week', 'day'].map((v) => (
                <Button
                    key={v}
                    variant={view === v ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onView(v)}
                    className={`h-7 text-xs capitalize ${view === v ? 'bg-[#9AD872] hover:bg-[#8bc964] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    {v}
                </Button>
            ))}
        </div>
    </div>
);

export default function FiberzoneSchedule() {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [users, setUsers] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());

    const [exportOpen, setExportOpen] = useState(false);
    const [exportMonth, setExportMonth] = useState((moment().month() + 1).toString());
    const [exportYear, setExportYear] = useState(moment().year().toString());

    const canEdit = user?.role === 'VP' || user?.role === 'Manager' || user?.role === 'SPV' || user?.role === 'SuperUser';

    useEffect(() => {
        fetchSchedules();
        fetchFiberzoneUsers();
        fetchFiberzoneSites();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/fiberzone/schedules`);
            setSchedules(response.data);
        } catch (error) {
            console.error('Failed to fetch fiberzone schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFiberzoneUsers = async () => {
        try {
            const response = await axios.get(`${API}/fiberzone/users`);
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch fiberzone users:', error);
        }
    };

    const fetchFiberzoneSites = async () => {
        try {
            const response = await axios.get(`${API}/fiberzone/sites-list`);
            setSites(response.data);
        } catch (error) {
            console.error('Failed to fetch fiberzone sites:', error);
        }
    };

    // Map schedules to calendar events
    const events = useMemo(() => schedules.map(s => ({
        id: s.id,
        title: `${s.site_name} - ${s.title}`,
        start: new Date(s.start_time),
        end: new Date(s.end_time),
        resource: s
    })), [schedules]);

    // Today's schedules for sidebar
    const todaySchedules = useMemo(() => {
        const today = moment().startOf('day');
        return schedules.filter(s => {
            const start = moment(s.start_time).startOf('day');
            const end = moment(s.end_time).startOf('day');
            return today.isBetween(start, end, null, '[]');
        });
    }, [schedules]);

    // Event style
    const eventStyleGetter = useCallback((event) => ({
        style: {
            backgroundColor: event.resource.status === 'Finished' ? '#86efac' : '#9AD872',
            borderColor: event.resource.status === 'Finished' ? '#4ade80' : '#76a15a',
            borderRadius: '6px',
            border: 'none',
            color: event.resource.status === 'Finished' ? '#166534' : 'white',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
        }
    }), []);

    const handleExport = async () => {
        try {
            const response = await axios.get(`${API}/fiberzone/schedules/export`, {
                params: { month: parseInt(exportMonth), year: parseInt(exportYear) },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fiberzone_schedules_export_${exportYear}_${exportMonth.padStart(2, '0')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setExportOpen(false);
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Failed to export CSV');
        }
    };

    // Click on a date slot → open create dialog
    const handleSelectSlot = useCallback(({ start }) => {
        if (!canEdit) return;
        setSelectedDate(start);
        setCreateOpen(true);
    }, [canEdit]);

    // Click on an event → open edit dialog
    const handleSelectEvent = useCallback((event) => {
        setSelectedSchedule(event.resource);
        setEditOpen(true);
    }, []);

    // Drag and drop → reschedule
    const handleEventDrop = useCallback(async ({ event, start, end }) => {
        if (!canEdit) return;

        try {
            await axios.put(`${API}/fiberzone/schedules/${event.id}`, {
                start_time: moment(start).format('YYYY-MM-DDTHH:mm:ss'),
                end_time: moment(end).format('YYYY-MM-DDTHH:mm:ss')
            });
            toast.success('Schedule rescheduled successfully');
            fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reschedule');
        }
    }, [canEdit]);

    // Resize event
    const handleEventResize = useCallback(async ({ event, start, end }) => {
        if (!canEdit) return;

        try {
            await axios.put(`${API}/fiberzone/schedules/${event.id}`, {
                start_time: moment(start).format('YYYY-MM-DDTHH:mm:ss'),
                end_time: moment(end).format('YYYY-MM-DDTHH:mm:ss')
            });
            toast.success('Schedule updated successfully');
            fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to resize schedule');
        }
    }, [canEdit]);

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#9AD872] to-[#8bc964] p-6 rounded-2xl shadow-lg text-white">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <CalendarIcon className="fill-white/30" size={28} />
                        Fiberzone Schedule
                    </h1>
                    <p className="text-white/80 font-medium text-sm">
                        {canEdit ? 'Manage technician schedules for Fiberzone sites' : 'View Fiberzone schedules'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setExportOpen(true)}
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold px-6 h-11 rounded-xl flex items-center gap-2"
                    >
                        <Download size={18} />
                        Export CSV
                    </Button>
                    {canEdit && (
                        <Button
                            onClick={() => {
                                setSelectedDate(new Date());
                                setCreateOpen(true);
                            }}
                            className="bg-white text-[#76a15a] hover:bg-slate-50 font-bold px-6 h-11 rounded-xl flex items-center gap-2 shadow-inner"
                        >
                            <Plus size={18} />
                            Create Schedule
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar */}
                <div className="w-full lg:w-[70%]">
                    <Card className="border-0 shadow-sm overflow-hidden">
                        <CardContent className="p-4">
                            <DnDCalendar
                                localizer={localizer}
                                events={events}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: 680 }}
                                selectable={canEdit}
                                resizable={canEdit}
                                draggableAccessor={() => canEdit}
                                onSelectSlot={handleSelectSlot}
                                onSelectEvent={handleSelectEvent}
                                onEventDrop={handleEventDrop}
                                onEventResize={handleEventResize}
                                eventPropGetter={eventStyleGetter}
                                view={view}
                                onView={setView}
                                date={date}
                                onNavigate={setDate}
                                views={['month', 'week', 'day']}
                                components={{
                                    toolbar: FiberzoneToolbar
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Today's Schedule Sidebar */}
                <div className="w-full lg:w-[30%]">
                    <Card className="border-0 shadow-sm h-[748px] flex flex-col">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Clock size={18} className="text-[#9AD872]" />
                                Today's Schedule
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                                {moment().format('dddd, MMMM D, YYYY')}
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                            {todaySchedules.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <CalendarIcon size={40} className="mb-3 text-slate-300" />
                                    <p className="font-medium">No schedules for today</p>
                                </div>
                            ) : (
                                todaySchedules.map(schedule => (
                                    <div
                                        key={schedule.id}
                                        className="p-4 rounded-xl border border-slate-100 hover:border-[#9AD872]/40 hover:shadow-sm transition-all cursor-pointer bg-white"
                                        onClick={() => {
                                            setSelectedSchedule(schedule);
                                            setEditOpen(true);
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-slate-800 text-sm leading-tight">
                                                {schedule.title}
                                            </h3>
                                            <Badge className={`text-[10px] shrink-0 ${schedule.status === 'Finished'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'}`}
                                            >
                                                {schedule.status === 'Finished' ? (
                                                    <><CheckCircle size={10} className="mr-0.5" /> Done</>
                                                ) : (
                                                    <><Clock size={10} className="mr-0.5" /> Scheduled</>
                                                )}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <MapPin size={12} className="text-[#9AD872] shrink-0" />
                                                <span className="truncate">{schedule.site_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <User size={12} className="text-[#9AD872] shrink-0" />
                                                <span>{schedule.user_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <Clock size={12} className="shrink-0" />
                                                <span>
                                                    {moment(schedule.start_time).format('HH:mm')} — {moment(schedule.end_time).format('HH:mm')}
                                                </span>
                                            </div>
                                            {schedule.created_by_name && (
                                                <div className="pt-0.5">
                                                    <span className="text-[11px] text-slate-400/70">Created by: {schedule.created_by_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Dialogs */}
            <CreateFiberzoneScheduleDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                users={users}
                sites={sites}
                onScheduleCreated={fetchSchedules}
                selectedDate={selectedDate}
            />

            <EditFiberzoneScheduleDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                schedule={selectedSchedule}
                users={users}
                sites={sites}
                onScheduleUpdated={fetchSchedules}
                canDelete={canEdit}
            />

            {/* Export Dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Export Fiberzone Schedule to CSV</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="month" className="text-right">Month</Label>
                            <Select value={exportMonth} onValueChange={setExportMonth}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {moment.months().map((month, idx) => (
                                        <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="year" className="text-right">Year</Label>
                            <Input
                                id="year"
                                type="number"
                                value={exportYear}
                                onChange={(e) => setExportYear(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
                        <Button onClick={handleExport} className="bg-[#9AD872] hover:bg-[#8bc964] text-white">
                            Export CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
