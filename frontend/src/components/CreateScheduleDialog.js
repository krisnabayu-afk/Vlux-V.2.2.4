import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import moment from 'moment';
import { toast } from 'sonner';
import { Plus, Calendar as CalendarIcon, Loader2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { cn } from '../lib/utils';
import { OptimizedMultiStaffCombobox, OptimizedSiteCombobox } from './SelectionComponents';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_API_URL}/api`;

const SCHEDULE_TITLES = [
    "Dismantle", "Instalasi Existing - APPS", "Instalasi Existing - Internet Bandwidth",
    "Instalasi Existing - WAAS", "Instalasi New - APPS", "Instalasi New - Internet Bandwidth",
    "Instalasi New - WAAS", "Maintenance", "Survey - New Client", "Survey - Existing Client",
    "Survey - Prospect Client", "Technical Visit", "TM - New", "TM - Existing", "Troubleshoot", "Other", "SOS"
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

const CreateScheduleDialog = ({
    user, users, sites, categories,
    onScheduleCreated, openedFromSummary, setOpenedFromSummary,
    setDailySummaryOpen, open, onOpenChange, selectedDate,
    prefillData // NEW: { site_id, title, ticket_id, description } from Ticket Detail
}) => {
    const { orgConfig } = useAuth();
    const [formData, setFormData] = useState({
        user_ids: [],
        division: '',
        category_id: '',
        title: '',
        description: '',
        start_date: '',
        start_hour: '09',
        start_minute: '00',
        end_date: '',
        end_hour: '18',
        end_minute: '00',
        site_id: '',
        product: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [departmentsData, setDepartmentsData] = useState([]);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${API}/departments`);
            setDepartmentsData(response.data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    useEffect(() => {
        if (open && selectedDate) {
            setFormData(prev => ({
                ...prev,
                start_date: moment(selectedDate).format('DD-MM-YYYY'),
                start_hour: '09',
                start_minute: '00',
                end_date: moment(selectedDate).format('DD-MM-YYYY'),
                end_hour: '18',
                end_minute: '00'
            }));
        }
    }, [open, selectedDate]);

    // NEW: Apply prefill data when dialog opens from Ticket Detail
    useEffect(() => {
        if (open && prefillData) {
            setFormData(prev => ({
                ...prev,
                site_id: prefillData.site_id || '',
                description: prefillData.description || '',
                ticket_id: prefillData.ticket_id || ''
            }));
        }
    }, [open, prefillData]);

    // Memoize eligible users within the dialog to restrict assignment scope
    const eligibleUsers = useMemo(() => {
        if (!user || !users) return [];
        return users.filter(u => {
            if (user.role === 'SuperUser') return true;

            let fallbackDept = null;
            for (const d of departmentsData) {
                if (d.divisions.includes(u.division)) {
                    fallbackDept = d.name;
                    break;
                }
            }
            const uDept = u.department || fallbackDept;

            // Admin Division: Can assign anyone in the same department OR in the mapped Technical Operations department
            const adminDivId = orgConfig?.division_mappings?.admin_division_id;
            const techOpsDeptId = orgConfig?.division_mappings?.tech_ops_department_id;
            const isAdminDiv = adminDivId ? (user.division_id === adminDivId || user.division === adminDivId) : (user.division === 'Admin');

            if (isAdminDiv) {
                // If in Admin Division, check if target user is in the same department OR in the mapped Tech Ops department
                if (uDept === user.department) return true;
                if (techOpsDeptId && (u.department_id === techOpsDeptId || uDept === "Technical Operation")) return true;
                
                // Extra fallback: check if target user is in one of the mapped Tech Ops divisions
                const techOpsDivs = [
                    orgConfig?.division_mappings?.ts_division_id,
                    orgConfig?.division_mappings?.apps_division_id,
                    orgConfig?.division_mappings?.infra_division_id,
                    orgConfig?.division_mappings?.fiberzone_division_id,
                    orgConfig?.division_mappings?.monitoring_division_id
                ].filter(Boolean);
                
                if (techOpsDivs.includes(u.division_id) || techOpsDivs.includes(u.division)) return true;

                return false;
            }

            // Scoped VP: restricted to their department if set
            if (user.role === 'VP') {
                if (user.department) return uDept === user.department;
                return true;
            }

            // Normal Manager/SPV constraints
            if (user.region && u.region && user.region !== u.region) return false;

            // Dynamic Hierarchy Check (using IDs or names)
            const userDivId = user.division_id || user.division;
            const targetDivId = u.division_id || u.division;

            // 1. Same Division
            if (userDivId === targetDivId) return true;

            // 2. Hierarchy Check (e.g., TS can manage Apps)
            const hierarchy = orgConfig?.division_hierarchy || {};
            
            // Check by ID first (most robust)
            if (user.division_id && u.division_id) {
                if (hierarchy[user.division_id]?.includes(u.division_id)) return true;
            }
            
            // Fallback to names or mixed
            if (hierarchy[userDivId]?.includes(targetDivId)) return true;

            // 3. Specific Legacy Fallbacks (if hierarchy is missing)
            const tsId = orgConfig?.division_mappings?.ts_division_id;
            const appsId = orgConfig?.division_mappings?.apps_division_id;
            const infraId = orgConfig?.division_mappings?.infra_division_id;
            const fzId = orgConfig?.division_mappings?.fiberzone_division_id;

            const isTS = (tsId && (user.division_id === tsId || user.division === tsId)) || user.division === 'TS';
            const isApps = (appsId && (u.division_id === appsId || u.division === appsId)) || u.division === 'Apps';
            if (isTS && isApps) return true;

            const isInfra = (infraId && (user.division_id === infraId || user.division === infraId)) || user.division === 'Infra';
            const isFZ = (fzId && (u.division_id === fzId || u.division === fzId)) || u.division === 'Fiberzone';
            if (isInfra && isFZ) return true;

            return false;
        });
    }, [users, user, departmentsData, orgConfig]);

    const isMonitoringSelected = useMemo(() => {
        return users.filter(u => formData.user_ids.includes(u.id)).some(u => u.division === 'Monitoring');
    }, [users, formData.user_ids]);

    const filteredCategories = useMemo(() => {
        if (isMonitoringSelected) {
            return categories.filter(cat => ['Shift Pagi', 'Shift Siang', 'Shift Malam', 'SOS'].includes(cat.name));
        }
        return categories;
    }, [categories, isMonitoringSelected]);

    // Auto-fill logic for Monitoring shifts
    useEffect(() => {
        if (isMonitoringSelected && formData.category_id) {
            const selectedCat = categories.find(c => c.id === formData.category_id);
            if (selectedCat && ['Shift Pagi', 'Shift Siang', 'Shift Malam'].includes(selectedCat.name)) {
                const shiftName = selectedCat.name;
                const shifts = {
                    'Shift Pagi': { start: '07:00', end: '16:00', nextDay: false },
                    'Shift Siang': { start: '13:00', end: '22:00', nextDay: false },
                    'Shift Malam': { start: '22:00', end: '07:00', nextDay: true },
                };

                const shift = shifts[shiftName];
                const datePart = formData.start_date || moment().format('DD-MM-YYYY');

                let endDt = moment(datePart, 'DD-MM-YYYY');
                if (shift.nextDay) {
                    endDt = endDt.add(1, 'day');
                }
                const endStr = endDt.format('DD-MM-YYYY');

                setFormData(prev => ({
                    ...prev,
                    start_date: datePart,
                    start_hour: shift.start.split(':')[0],
                    start_minute: shift.start.split(':')[1],
                    end_date: endStr,
                    end_hour: shift.end.split(':')[0],
                    end_minute: shift.end.split(':')[1],
                    title: shiftName
                }));
            }
        }
    }, [formData.category_id, isMonitoringSelected, categories, formData.start_date]);

    const isShiftSelected = useMemo(() => {
        if (!isMonitoringSelected || !formData.category_id) return false;
        const cat = categories.find(c => c.id === formData.category_id);
        return cat && ['Shift Pagi', 'Shift Siang', 'Shift Malam'].includes(cat.name);
    }, [isMonitoringSelected, formData.category_id, categories]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.user_ids.length === 0) {
            toast.error('Please select at least one staff member');
            return;
        }
        if (!formData.site_id) {
            toast.error('Please select a site');
            return;
        }
        if (!formData.product) {
            toast.error('Please select a product');
            return;
        }

        try {
            // Format dates back to YYYY-MM-DD HH:mm for the backend
            const formattedData = {
                ...formData,
                start_date: moment(`${formData.start_date} ${formData.start_hour}:${formData.start_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm'),
                end_date: moment(`${formData.end_date} ${formData.end_hour}:${formData.end_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm'),
                ticket_id: formData.ticket_id || (prefillData?.ticket_id) || undefined
            };
            delete formattedData.start_hour;
            delete formattedData.start_minute;
            delete formattedData.end_hour;
            delete formattedData.end_minute;
            const response = await axios.post(`${API}/schedules`, formattedData);
            toast.success(response.data.message);
            setFormData({
                user_ids: [], division: '', category_id: '',
                title: '', description: '', start_date: '', start_hour: '09', start_minute: '00', end_date: '', end_hour: '18', end_minute: '00', site_id: '', product: '', ticket_id: ''
            });
            onOpenChange(false);
            if (onScheduleCreated) onScheduleCreated();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create schedule');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto w-full" data-testid="schedule-dialog">
                <DialogHeader>
                    <DialogTitle>{prefillData ? 'Assign Schedule from Ticket' : 'Create New Schedule'}</DialogTitle>
                    <DialogDescription>{prefillData ? 'Assign a schedule linked to this ticket.' : 'Fill in the details to create a new schedule.'}</DialogDescription>
                </DialogHeader>
                {prefillData && (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm">
                        <p className="font-semibold text-blue-800 dark:text-blue-300">Linked Ticket</p>
                        <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">{prefillData.title} — {prefillData.site_name || 'No Site'}</p>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Assign To (Multi-Select)</Label>
                        <OptimizedMultiStaffCombobox
                            users={eligibleUsers}
                            selectedIds={formData.user_ids}
                            onChange={(ids) => setFormData({ ...formData, user_ids: ids })}
                            isLoading={users.length === 0}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Activity Category *</Label>
                        <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })}>
                            <SelectTrigger data-testid="category-select">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCategories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isShiftSelected && (
                            <div className="text-xs font-medium text-blue-500 flex items-center gap-1 mt-1">
                                <Check size={12} /> Standard Shift Applied
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Select value={formData.title} onValueChange={(value) => setFormData({ ...formData, title: value })}>
                            <SelectTrigger id="title" data-testid="title-select">
                                <SelectValue placeholder="Select title" />
                            </SelectTrigger>
                            <SelectContent>
                                {SCHEDULE_TITLES.map((title) => (
                                    <SelectItem key={title} value={title} disabled={isShiftSelected}>{title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            data-testid="description-input"
                            placeholder="Contoh: Troubleshoot - Site Visit - *Nama Site."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Site *</Label>
                        {prefillData?.site_id ? (
                            <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-foreground">
                                {sites.find(s => s.id === formData.site_id)?.name || 'Linked Site'}
                            </div>
                        ) : (
                            <OptimizedSiteCombobox
                                sites={sites}
                                value={formData.site_id}
                                onChange={(val) => setFormData({ ...formData, site_id: val })}
                                isLoading={sites.length === 0}
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Product *</Label>
                        <Select value={formData.product} onValueChange={(val) => setFormData({ ...formData, product: val })}>
                            <SelectTrigger data-testid="product-select">
                                <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                                {['Internet', 'WAAS', 'VLEPO', 'FTTR', 'Keponet'].map(prod => (
                                    <SelectItem key={prod} value={prod}>{prod}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Start Date & Time</Label>
                            <div className="flex gap-2">
                                <div className="flex flex-1 gap-1">
                                    <Input
                                        type="text"
                                        placeholder="DD-MM-YYYY"
                                        value={formData.start_date}
                                        onChange={(e) => {
                                            const dateStr = e.target.value;
                                            if (isShiftSelected) {
                                                const shift = (categories.find(c => c.id === formData.category_id)?.name === 'Shift Malam')
                                                    ? { nextDay: true }
                                                    : { nextDay: false };
                                                let endDt = moment(dateStr, 'DD-MM-YYYY');
                                                if (shift.nextDay) endDt = endDt.add(1, 'day');
                                                setFormData({ ...formData, start_date: dateStr, end_date: endDt.format('DD-MM-YYYY') });
                                            } else {
                                                setFormData({ ...formData, start_date: dateStr });
                                            }
                                        }}
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
                                                    const dateStr = moment(date).format('DD-MM-YYYY');
                                                    if (isShiftSelected) {
                                                        const shift = (categories.find(c => c.id === formData.category_id)?.name === 'Shift Malam')
                                                            ? { nextDay: true }
                                                            : { nextDay: false };
                                                        let endDt = moment(date);
                                                        if (shift.nextDay) endDt = endDt.add(1, 'day');
                                                        setFormData({ ...formData, start_date: dateStr, end_date: endDt.format('DD-MM-YYYY') });
                                                    } else {
                                                        setFormData({ ...formData, start_date: dateStr });
                                                    }
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex gap-1">
                                    <Select
                                        value={formData.start_hour}
                                        onValueChange={(val) => setFormData({ ...formData, start_hour: val })}
                                        disabled={isShiftSelected}
                                    >
                                        <SelectTrigger className={cn("w-[70px] h-9", isShiftSelected && "bg-muted/50 cursor-not-allowed")}>
                                            <SelectValue placeholder="HH" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {HOUR_OPTIONS.map(h => (
                                                <SelectItem key={h} value={h}>{h}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={formData.start_minute}
                                        onValueChange={(val) => setFormData({ ...formData, start_minute: val })}
                                        disabled={isShiftSelected}
                                    >
                                        <SelectTrigger className={cn("w-[70px] h-9", isShiftSelected && "bg-muted/50 cursor-not-allowed")}>
                                            <SelectValue placeholder="MM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MINUTE_OPTIONS.map(m => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>End Date & Time</Label>
                            <div className="flex gap-2">
                                <div className="flex flex-1 gap-1">
                                    <Input
                                        type="text"
                                        placeholder="DD-MM-YYYY"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        readOnly={isShiftSelected}
                                        className={cn("flex-1 text-sm h-9", isShiftSelected && "bg-muted/50 cursor-not-allowed")}
                                    />
                                    <Popover>
                                        <PopoverTrigger asChild disabled={isShiftSelected}>
                                            <Button variant="outline" size="sm" className={cn("px-2 h-9", !formData.end_date && "text-muted-foreground")} disabled={isShiftSelected}>
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
                                    <Select
                                        value={formData.end_hour}
                                        onValueChange={(val) => setFormData({ ...formData, end_hour: val })}
                                        disabled={isShiftSelected}
                                    >
                                        <SelectTrigger className={cn("w-[70px] h-9", isShiftSelected && "bg-muted/50 cursor-not-allowed")}>
                                            <SelectValue placeholder="HH" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {HOUR_OPTIONS.map(h => (
                                                <SelectItem key={h} value={h}>{h}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={formData.end_minute}
                                        onValueChange={(val) => setFormData({ ...formData, end_minute: val })}
                                        disabled={isShiftSelected}
                                    >
                                        <SelectTrigger className={cn("w-[70px] h-9", isShiftSelected && "bg-muted/50 cursor-not-allowed")}>
                                            <SelectValue placeholder="MM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MINUTE_OPTIONS.map(m => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Schedule
                        </Button>
                    </div>
                </form >
            </DialogContent >
        </Dialog >
    );
};

export default CreateScheduleDialog;
