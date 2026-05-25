import React, { useState, useMemo } from 'react';
import axios from 'axios';
import moment from 'moment';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { cn } from '../../lib/utils';
import { OptimizedMultiStaffCombobox, OptimizedSiteCombobox } from '../SelectionComponents';

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

const CreateFiberzoneScheduleDialog = ({
    open, onOpenChange, users, sites, onScheduleCreated, selectedDate
}) => {
    const [formData, setFormData] = useState({
        user_ids: [],
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

    // Pre-fill date when dialog opens
    React.useEffect(() => {
        if (open && selectedDate) {
            setFormData(prev => ({
                ...prev,
                start_date: moment(selectedDate).format('DD-MM-YYYY'),
                end_date: moment(selectedDate).format('DD-MM-YYYY'),
                start_hour: '09',
                start_minute: '00',
                end_hour: '18',
                end_minute: '00'
            }));
        }
    }, [open, selectedDate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.user_ids.length === 0) {
            toast.error('Please select at least one technician');
            return;
        }
        if (!formData.site_id) {
            toast.error('Please select a site');
            return;
        }
        if (!formData.title) {
            toast.error('Please select or enter a title');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                user_ids: formData.user_ids,
                site_id: formData.site_id,
                title: formData.title,
                start_time: moment(`${formData.start_date} ${formData.start_hour}:${formData.start_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss'),
                end_time: moment(`${formData.end_date} ${formData.end_hour}:${formData.end_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss')
            };

            const response = await axios.post(`${API}/fiberzone/schedules`, payload);
            toast.success(response.data.message);
            setFormData({
                user_ids: [], site_id: '', title: '',
                start_date: '', start_hour: '09', start_minute: '00',
                end_date: '', end_hour: '18', end_minute: '00'
            });
            onOpenChange(false);
            if (onScheduleCreated) onScheduleCreated();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create fiberzone schedule');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto w-full">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#9AD872]" />
                        Create Fiberzone Schedule
                    </DialogTitle>
                    <DialogDescription>Assign technicians to Fiberzone sites.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Technician Selection */}
                    <div className="space-y-2">
                        <Label>Assign Technician(s) <span className="text-xs text-muted-foreground">(Fiberzone Division)</span></Label>
                        <OptimizedMultiStaffCombobox
                            users={users}
                            selectedIds={formData.user_ids}
                            onChange={(ids) => setFormData({ ...formData, user_ids: ids })}
                            isLoading={users.length === 0}
                        />
                    </div>

                    {/* Site Selection */}
                    <div className="space-y-2">
                        <Label>Site <span className="text-xs text-muted-foreground">(Fiberzone Sites Only)</span></Label>
                        <OptimizedSiteCombobox
                            sites={sites}
                            value={formData.site_id}
                            onChange={(val) => setFormData({ ...formData, site_id: val })}
                            isLoading={sites.length === 0}
                            emptyLabel="Select site..."
                            placeholder="Search fiberzone site..."
                        />
                    </div>

                    {/* Title / Purpose */}
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
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue placeholder="HH" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={formData.start_minute} onValueChange={(val) => setFormData({ ...formData, start_minute: val })}>
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue placeholder="MM" /></SelectTrigger>
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
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue placeholder="HH" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={formData.end_minute} onValueChange={(val) => setFormData({ ...formData, end_minute: val })}>
                                    <SelectTrigger className="w-[70px] h-9"><SelectValue placeholder="MM" /></SelectTrigger>
                                    <SelectContent>
                                        {MINUTE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-[#9AD872] hover:bg-[#8bc964] text-white">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Schedule
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateFiberzoneScheduleDialog;
