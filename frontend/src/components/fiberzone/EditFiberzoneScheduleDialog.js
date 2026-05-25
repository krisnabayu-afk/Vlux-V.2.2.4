import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import { toast } from 'sonner';
import { Loader2, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { cn } from '../../lib/utils';
import { OptimizedStaffCombobox, OptimizedSiteCombobox } from '../SelectionComponents';

const API = `${process.env.REACT_APP_API_URL}/api`;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

const FIBERZONE_TITLES = [
    "Instalasi New Client",
    "Instalasi Existing Client",
    "Troubleshoot",
    "Maintenance",
    "Survey - New Client",
    "Survey - Existing Client",
    "Dismantle",
    "Technical Visit",
    "Other"
];

const EditFiberzoneScheduleDialog = ({
    open, onOpenChange, schedule, users, sites, onScheduleUpdated, canDelete = true
}) => {
    const [formData, setFormData] = useState({
        user_id: '',
        site_id: '',
        title: '',
        start_date: '',
        start_hour: '09',
        start_minute: '00',
        end_date: '',
        end_hour: '18',
        end_minute: '00'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && schedule) {
            const startDt = moment(schedule.start_time);
            const endDt = moment(schedule.end_time);
            setFormData({
                user_id: schedule.user_id,
                site_id: schedule.site_id,
                title: schedule.title,
                start_date: startDt.format('DD-MM-YYYY'),
                start_hour: startDt.format('HH'),
                start_minute: startDt.format('mm'),
                end_date: endDt.format('DD-MM-YYYY'),
                end_hour: endDt.format('HH'),
                end_minute: endDt.format('mm')
            });
        }
    }, [open, schedule]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!schedule) return;

        setIsSubmitting(true);
        try {
            const payload = {
                user_id: formData.user_id,
                site_id: formData.site_id,
                title: formData.title,
                start_time: moment(`${formData.start_date} ${formData.start_hour}:${formData.start_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss'),
                end_time: moment(`${formData.end_date} ${formData.end_hour}:${formData.end_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss')
            };

            await axios.put(`${API}/fiberzone/schedules/${schedule.id}`, payload);
            toast.success('Schedule updated successfully');
            onOpenChange(false);
            if (onScheduleUpdated) onScheduleUpdated();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update schedule');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!schedule) return;
        if (!window.confirm('Are you sure you want to delete this schedule?')) return;

        try {
            await axios.delete(`${API}/fiberzone/schedules/${schedule.id}`);
            toast.success('Schedule deleted successfully');
            onOpenChange(false);
            if (onScheduleUpdated) onScheduleUpdated();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete schedule');
        }
    };

    if (!schedule) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto w-full">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#9AD872]" />
                        Edit Fiberzone Schedule
                        <Badge className={schedule.status === 'Finished' 
                            ? 'bg-green-100 text-green-700 ml-2' 
                            : 'bg-blue-100 text-blue-700 ml-2'}
                        >
                            {schedule.status}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>Update schedule details or delete.</DialogDescription>
                </DialogHeader>
                {schedule?.created_by_name && (
                    <div className="px-1 pb-1">
                        <span className="text-[11px] text-muted-foreground/70">Created by: {schedule.created_by_name}</span>
                    </div>
                )}
                <form onSubmit={handleUpdate} className="space-y-4">
                    {/* Technician */}
                    <div className="space-y-2">
                        <Label>Technician</Label>
                        <OptimizedStaffCombobox
                            users={users}
                            value={formData.user_id}
                            onChange={(val) => setFormData({ ...formData, user_id: val })}
                            isLoading={users.length === 0}
                        />
                    </div>

                    {/* Site */}
                    <div className="space-y-2">
                        <Label>Site</Label>
                        <OptimizedSiteCombobox
                            sites={sites}
                            value={formData.site_id}
                            onChange={(val) => setFormData({ ...formData, site_id: val })}
                            isLoading={sites.length === 0}
                            emptyLabel="Select site..."
                            placeholder="Search fiberzone site..."
                        />
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label>Title / Purpose</Label>
                        <Select value={formData.title} onValueChange={(val) => setFormData({ ...formData, title: val })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select purpose" />
                            </SelectTrigger>
                            <SelectContent>
                                {FIBERZONE_TITLES.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Product (Read-only) */}
                    <div className="space-y-2">
                        <Label>Product</Label>
                        <Input value="Fiberzone" readOnly className="bg-muted cursor-not-allowed text-muted-foreground" />
                    </div>

                    {/* Start Date/Time */}
                    <div className="space-y-2">
                        <Label>Start Date & Time</Label>
                        <div className="flex gap-2">
                            <div className="flex flex-1 gap-1">
                                <Input
                                    type="text"
                                    placeholder="DD-MM-YYYY"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                    className="flex-1 text-sm h-9"
                                />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("px-2 h-9", !formData.start_date && "text-muted-foreground")}>
                                            <CalendarIcon className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={formData.start_date ? moment(formData.start_date, 'DD-MM-YYYY').toDate() : undefined}
                                            onSelect={(date) => {
                                                if (!date) return;
                                                setFormData({ ...formData, start_date: moment(date).format('DD-MM-YYYY') });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex gap-1">
                                <Select value={formData.start_hour} onValueChange={(val) => setFormData({ ...formData, start_hour: val })}>
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={formData.start_minute} onValueChange={(val) => setFormData({ ...formData, start_minute: val })}>
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {MINUTE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* End Date/Time */}
                    <div className="space-y-2">
                        <Label>End Date & Time</Label>
                        <div className="flex gap-2">
                            <div className="flex flex-1 gap-1">
                                <Input
                                    type="text"
                                    placeholder="DD-MM-YYYY"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    required
                                    className="flex-1 text-sm h-9"
                                />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("px-2 h-9", !formData.end_date && "text-muted-foreground")}>
                                            <CalendarIcon className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={formData.end_date ? moment(formData.end_date, 'DD-MM-YYYY').toDate() : undefined}
                                            onSelect={(date) => {
                                                if (!date) return;
                                                setFormData({ ...formData, end_date: moment(date).format('DD-MM-YYYY') });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex gap-1">
                                <Select value={formData.end_hour} onValueChange={(val) => setFormData({ ...formData, end_hour: val })}>
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={formData.end_minute} onValueChange={(val) => setFormData({ ...formData, end_minute: val })}>
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {MINUTE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between pt-2">
                        {canDelete && (
                            <Button type="button" variant="outline" onClick={handleDelete} className="text-red-500 border-red-300 hover:bg-red-50">
                                <Trash2 size={16} className="mr-1" />
                                Delete
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-[#9AD872] hover:bg-[#8bc964] text-white">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditFiberzoneScheduleDialog;
