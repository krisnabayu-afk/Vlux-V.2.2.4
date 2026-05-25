import { useEffect, useState, useMemo, memo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCanEdit } from '../context/PermissionContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, Download, Calendar as CalendarIcon, Edit, Trash2, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Play, Pause, MessageSquare, Check, ChevronsUpDown, MapPin, FileText, RotateCcw } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import CreateScheduleDialog from '../components/CreateScheduleDialog';
import {
  OptimizedMultiStaffCombobox as MultiStaffCombobox,
  OptimizedStaffCombobox as StaffCombobox,
  OptimizedSiteCombobox as SiteCombobox
} from '../components/SelectionComponents';
import { InvertedWeekView, InvertedDayView } from '../components/InvertedCalendarViews';
import { CustomToolbar } from '../components/schedule/CustomToolbar';
import { BulkUploadDialog } from '../components/schedule/BulkUploadDialog';
import { EditScheduleDialog } from '../components/schedule/EditScheduleDialog';
import { DailySummaryDialog } from '../components/schedule/DailySummaryDialog';
import { HolidayManagementDialog } from '../components/schedule/HolidayManagementDialog';
import { HolidayFormDialog } from '../components/schedule/HolidayFormDialog';
import { DynamicFilter } from '../components/DynamicFilter';

const localizer = momentLocalizer(moment);
const API = `${process.env.REACT_APP_API_URL}/api`;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// Custom Calendar Toolbar with clickable month/year

// Shared components removed and replaced by SelectionComponents.js



const Schedule = () => {
  const { user, isTechOps, orgConfig } = useAuth();
  const canEditPerm = useCanEdit('scheduler');
  const location = useLocation();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]); // NEW: Sites state
  const [categories, setCategories] = useState([]); // NEW: Activity categories
  const [departments, setDepartments] = useState([]); // NEW: Departments state
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null); // For editing
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [filterUserId, setFilterUserId] = useState('all'); // NEW: Staff filter state
  const [filterDivision, setFilterDivision] = useState('all'); // NEW: Division filter state
  const [filterRegion, setFilterRegion] = useState('all'); // REGIONAL: Region filter state
  const [filterSiteId, setFilterSiteId] = useState('all'); // NEW: Site filter state
  const [activeFilters, setActiveFilters] = useState([]);

  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [openedFromSummary, setOpenedFromSummary] = useState(false); // NEW: Track origin
  const [morningBriefingUrl, setMorningBriefingUrl] = useState(null); // NEW: Morning Briefing URL
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Holiday State
  const [holidays, setHolidays] = useState([]);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayFormOpen, setHolidayFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState((moment().month() + 1).toString());
  const [exportYear, setExportYear] = useState(moment().year().toString());
  const [holidayFormData, setHolidayFormData] = useState({
    start_date: '',
    end_date: '',
    description: '',
    is_recurring: false
  });

  // FormData moved to CreateScheduleDialog.js for creation
  // Re-adding small part of formData for EDITING purposes
  const [editFormData, setEditFormData] = useState({
    user_id: '',
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
    site_id: ''
  });
  const [uploadFile, setUploadFile] = useState(null);

  // Activity Detail State
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [selectedScheduleForActivity, setSelectedScheduleForActivity] = useState(null); // To hold the schedule for which activity is being viewed
  const [activityData, setActivityData] = useState(null); // To hold the fetched activity data

  const [loadingActivity, setLoadingActivity] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // NEW: Image preview state

  // PHASE 2: SPV can also edit/delete
  const canEdit = user?.role === 'VP' || user?.role === 'Manager' || user?.role === 'SPV' || user?.role === 'SuperUser';

  const isHolidayAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role === 'SuperUser') return true;
    if (!isTechOps) return false;

    // Check if user is in Admin division via orgConfig mapping or fallback
    const isAdminDiv = orgConfig?.division_mappings?.admin_division_id
      ? user.division_id === orgConfig.division_mappings.admin_division_id
      : user.division === 'Admin';

    return isAdminDiv || user.role === 'VP';
  }, [user, isTechOps, orgConfig]);

  const SCHEDULE_FILTER_FIELDS = useMemo(() => {
    const concatLabels = orgConfig?.division_concatenations ? Object.keys(orgConfig.division_concatenations) : [];
    const defaultConcats = isTechOps ? ['Infra & Fiberzone', 'TS & Apps'] : [];
    const concats = concatLabels.length > 0 ? concatLabels : defaultConcats;

    return {
      user_id: { label: 'Staff', type: 'staff' },
      site_id: { label: 'Site', type: 'site' },
      division: {
        label: 'Division',
        type: 'select',
        options: [
          ...concats,
          ...departments.flatMap(d => d.divisions).filter((v, i, a) => a.indexOf(v) === i).sort()
        ]
      },
      region: { label: 'Region', type: 'select', options: ['Region 1', 'Region 2', 'Region 3'] }
    };
  }, [departments, isTechOps, orgConfig]);

  useEffect(() => {
    fetchSchedules();
    fetchUsers();
    fetchSites(); // NEW: Fetch sites
    fetchCategories(); // NEW: Fetch categories
    fetchHolidays(); // NEW: Fetch holidays
    fetchDepartments(); // NEW: Fetch departments
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  // Memoize eligible users to restrict assignment scope
  const eligibleUsers = useMemo(() => {
    if (!user || !users) return [];
    return users.filter(u => {
      if (user.role === 'SuperUser') return true;

      let fallbackDept = null;
      for (const d of departments) {
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
        if (uDept === user.department) return true;
        if (techOpsDeptId && (u.department_id === techOpsDeptId || uDept === "Technical Operation")) return true;

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

      if (user.role === 'VP') {
        if (user.department) return uDept === user.department;
        return true;
      }

      if (user.region && u.region && user.region !== u.region) return false;

      // Dynamic Hierarchy Check (using IDs or names)
      const userDivId = user.division_id || user.division;
      const targetDivId = u.division_id || u.division;

      if (userDivId === targetDivId) return true;

      const hierarchy = orgConfig?.division_hierarchy || {};
      if (user.division_id && u.division_id && hierarchy[user.division_id]?.includes(u.division_id)) return true;
      if (hierarchy[userDivId]?.includes(targetDivId)) return true;

      // Fallbacks
      const tsId = orgConfig?.division_mappings?.ts_division_id;
      const appsId = orgConfig?.division_mappings?.apps_division_id;
      const isTS = (tsId && (user.division_id === tsId || user.division === tsId)) || user.division === 'TS';
      const isApps = (appsId && (u.division_id === appsId || u.division === appsId)) || u.division === 'Apps';
      if (isTS && isApps) return true;

      const infraId = orgConfig?.division_mappings?.infra_division_id;
      const fzId = orgConfig?.division_mappings?.fiberzone_division_id;
      const isInfra = (infraId && (user.division_id === infraId || user.division === infraId)) || user.division === 'Infra';
      const isFZ = (fzId && (u.division_id === fzId || u.division === fzId)) || u.division === 'Fiberzone';
      if (isInfra && isFZ) return true;

      return false;
    });
  }, [users, user, departments, orgConfig]);

  // SCHEDULE_TITLES moved to CreateScheduleDialog.js or shared if needed
  // Removing from here to avoid redundancy


  // Handle deep linking from notifications
  useEffect(() => {
    if (location.state?.openScheduleId && schedules.length > 0) {
      const scheduleId = location.state.openScheduleId;
      const schedule = schedules.find(s => s.id === scheduleId);

      if (schedule) {
        // Navigate to the date of the schedule
        const newDate = new Date(schedule.start_date);
        setDate(newDate);
        // Optional: Switch to day view or agenda view to make it easier to see?
        // setView('day'); 

        // Show the summary/details for this day
        showDailySummary(newDate);

        // Clear state to avoid reopening on refresh (optional, but good practice)
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, schedules]);

  // NEW: Fetch Morning Briefing when viewing daily summary
  useEffect(() => {
    if (dailySummaryOpen && selectedDate) {
      fetchMorningBriefing(selectedDate);
    } else {
      setMorningBriefingUrl(null);
    }
  }, [dailySummaryOpen, selectedDate]);

  const fetchMorningBriefing = async (date) => {
    try {
      const dateStr = moment(date).format('YYYY-MM-DD');
      const response = await axios.get(`${API}/morning-briefing/${dateStr}`);
      setMorningBriefingUrl(response.data.url);
    } catch (error) {
      setMorningBriefingUrl(null);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/schedules?t=${Date.now()}`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchSites = async () => {
    try {
      // Request all sites by using a high limit (no pagination needed for dropdown)
      const response = await axios.get(`${API}/sites`, {
        params: {
          limit: 9999 // Get all sites for dropdown
        }
      });
      // Handle paginated response structure (same as Sites.js)
      if (response.data.items) {
        setSites(Array.isArray(response.data.items) ? response.data.items : []);
      } else {
        // Fallback for non-paginated response
        setSites(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
      setSites([]); // Ensure sites is always an array
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/activity-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await axios.get(`${API}/holidays`);
      setHolidays(response.data);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };
  // Dynamic Filtering Logic
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      // If there are no active filters with specific values (other than 'all'), show everything.
      // However, the requested logic often implies checking each filter in the array.

      for (const filter of activeFilters) {
        if (!filter.value || filter.value === 'all') continue;

        let match = false;
        const val = filter.value.toLowerCase();

        if (filter.field === 'user_id') {
          match = s.user_id === filter.value;
        } else if (filter.field === 'site_id') {
          match = s.site_id === filter.value;
        } else if (filter.field === 'division') {
          match = s.division === filter.value;
        } else if (filter.field === 'region') {
          match = s.site_region === filter.value;
        }

        if (filter.operator === 'is' || filter.operator === 'contains') {
          if (!match) return false;
        } else if (filter.operator === 'is_not' || filter.operator === 'not_contains') {
          if (match) return false;
        }
      }
      return true;
    });
  }, [schedules, activeFilters]);

  const currentDailySchedules = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDay = moment(selectedDate).startOf('day');
    return filteredSchedules.filter(schedule => {
      const scheduleStart = moment(schedule.start_date).startOf('day');
      const scheduleEnd = schedule.end_date ? moment(schedule.end_date).startOf('day') : scheduleStart;
      return selectedDay.isBetween(scheduleStart, scheduleEnd, null, '[]');
    });
  }, [selectedDate, filteredSchedules]);

  const currentHoliday = useMemo(() => {
    if (!selectedDate || holidays.length === 0) return null;
    const selectedDay = moment(selectedDate).startOf('day');
    return holidays.find(h => {
      const start = moment(h.start_date).startOf('day');
      const end = moment(h.end_date || h.start_date).endOf('day');
      return selectedDay.isBetween(start, end, null, '[]');
    });
  }, [selectedDate, holidays]);

  const events = filteredSchedules.map(schedule => ({
    id: schedule.id,
    title: schedule.site_name ? `${schedule.site_name} - ${schedule.title}` : schedule.title,
    start: new Date(schedule.start_date),
    end: schedule.end_date ? new Date(schedule.end_date) : new Date(schedule.start_date),
    resource: schedule
  }));

  const handleSelectSlot = ({ start, action }) => {
    // PHASE 2: Show daily summary for all users (including Staff)
    showDailySummary(start);
  };

  const showDailySummary = (date) => {
    setSelectedDate(date);
    setDailySummaryOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/schedules/export`, {
        params: { month: parseInt(exportMonth), year: parseInt(exportYear) },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schedules_export_${exportYear}_${exportMonth.padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportOpen(false);
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleEdit = (schedule) => {
    setSelectedSchedule(schedule);
    const startDt = moment(schedule.start_date);
    const endDt = schedule.end_date ? moment(schedule.end_date) : moment(schedule.start_date).endOf('day');

    setEditFormData({
      user_id: schedule.user_id,
      user_name: schedule.user_name,
      division: schedule.division,
      category_id: schedule.category_id || '',
      title: schedule.title,
      description: schedule.description || '',
      start_date: startDt.format('DD-MM-YYYY'),
      start_hour: startDt.format('HH'),
      start_minute: startDt.format('mm'),
      end_date: endDt.format('DD-MM-YYYY'),
      end_hour: endDt.format('HH'),
      end_minute: endDt.format('mm'),
      site_id: schedule.site_id || '',
      product: schedule.product || ''
    });
    setEditOpen(true);
  };

  const isShiftSelected = useMemo(() => {
    if (!selectedSchedule || !editFormData.category_id) return false;
    if (selectedSchedule.division !== 'Monitoring') return false;
    const cat = categories.find(c => c.id === editFormData.category_id);
    return cat && ['Shift Pagi', 'Shift Siang', 'Shift Malam'].includes(cat.name);
  }, [selectedSchedule, editFormData.category_id, categories]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      // Format dates back to YYYY-MM-DD HH:mm for the backend
      const payload = {
        ...editFormData,
        start_date: moment(`${editFormData.start_date} ${editFormData.start_hour}:${editFormData.start_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm'),
        end_date: moment(`${editFormData.end_date} ${editFormData.end_hour}:${editFormData.end_minute}`, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm')
      };
      delete payload.start_hour;
      delete payload.start_minute;
      delete payload.end_hour;
      delete payload.end_minute;

      await axios.put(`${API}/schedules/${selectedSchedule.id}`, payload);
      toast.success('Schedule updated successfully!');
      setEditOpen(false);
      await fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update schedule');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await axios.delete(`${API}/schedules/${scheduleId}`);
      toast.success('Schedule deleted successfully!');
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete schedule');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await axios.post(`${API}/schedules/bulk-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Upload errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} rows had errors. Check console for details.`);
      }
      setBulkUploadOpen(false);
      setUploadFile(null);
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload schedules');
    }
  };

  const handleScheduleClick = async (schedule) => {
    setActivityDetailOpen(true);
    setLoadingActivity(true);
    setSelectedScheduleForActivity(schedule); // Set the schedule first
    setActivityData(null); // Reset previous activity data

    try {
      // Fetch activity details using the public endpoint
      const response = await axios.get(`${API}/activities/schedule/${schedule.id}`);
      setActivityData(response.data || null);
    } catch (error) {
      console.error('Failed to fetch activity details:', error);
      setActivityData(null); // No activity data found
    } finally {
      setLoadingActivity(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'bg-slate-200 text-slate-700', icon: Clock },
      'In Progress': { color: 'bg-gray-700/50 text-gray-200', icon: Play },
      'Finished': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'Cancelled': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'On Hold': { color: 'bg-yellow-100 text-yellow-700', icon: Pause }
    };
    const config = statusConfig[status] || statusConfig['Pending'];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center space-x-1 w-fit`}>
        <Icon size={12} />
        <span>{status}</span>
      </Badge>
    );
  };

  const downloadTemplate = () => {
    const csv = 'user_email,title,description,start_date,end_date\\nstaff@example.com,Night Shift,Night shift duties,2026-03-01 22:00,2026-03-02 06:00';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule_template.csv';
    a.click();
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleToday = () => {
    setDate(new Date());
  };

  const eventStyleGetter = (event) => {
    const colors = {
      'Infra': { backgroundColor: '#eab308', borderColor: '#ca8a04' }, // Yellow
      'TS': { backgroundColor: '#ec4899', borderColor: '#db2777' }, // Pink
      'Apps': { backgroundColor: '#ef4444', borderColor: '#dc2626' }, // Red
      'Fiberzone': { backgroundColor: '#22c55e', borderColor: '#16a34a' }, // Green
      'Monitoring': { backgroundColor: '#3b82f6', borderColor: '#2563eb' }, // Blue
      'Internal Support': { backgroundColor: '#06b6d4', borderColor: '#0891b2' } // Cyan
    };

    const divisionColor = colors[event.resource.division] || { backgroundColor: '#6b7280', borderColor: '#4b5563' };

    return {
      style: {
        ...divisionColor,
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        padding: '4px 8px',
        cursor: 'pointer'
      }
    };
  };

  const dayPropGetter = (date) => {
    const holiday = holidays.find(h => {
      const start = moment(h.start_date).startOf('day');
      const end = moment(h.end_date || h.start_date).endOf('day');
      return moment(date).isBetween(start, end, null, '[]');
    });
    if (holiday) {
      return {
        className: 'bg-red-500/10 border-red-500/20',
        style: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }
      };
    }
    return {};
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await axios.put(`${API}/holidays/${editingHoliday.id}`, holidayFormData);
        toast.success('Holiday updated successfully');
      } else {
        await axios.post(`${API}/holidays`, holidayFormData);
        toast.success('Holiday added successfully');
      }
      setHolidayFormOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save holiday');
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await axios.delete(`${API}/holidays/${id}`);
      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      toast.error('Failed to delete holiday');
    }
  };

  // PHASE 2: Check if user can edit/delete specific schedule
  const canModifySchedule = (schedule) => {
    // Grant access if user is the creator
    if (user && schedule.created_by === user.id) return true;

    if (!canEdit) return false;
    if (user.role === 'VP') return true;

    // Technical Operation Admin managers can modify any schedule in their department
    if (isTechOps && user.division === 'Admin' && user.role === 'Manager') {
      return true;
    }

    // Same division
    if (schedule.division === user.division) return true;

    // Hierarchy check: TS can manage Apps, Infra can manage Fiberzone
    const userDivId = user.division_id || user.division;
    const scheduleDivId = schedule.division_id || schedule.division;
    const hierarchy = orgConfig?.division_hierarchy || {};
    if (hierarchy[userDivId]?.includes(scheduleDivId)) return true;

    // Legacy fallbacks
    const tsId = orgConfig?.division_mappings?.ts_division_id;
    const appsId = orgConfig?.division_mappings?.apps_division_id;
    const infraId = orgConfig?.division_mappings?.infra_division_id;
    const fzId = orgConfig?.division_mappings?.fiberzone_division_id;

    const isTS = (tsId && (user.division_id === tsId || user.division === tsId)) || user.division === 'TS';
    const isScheduleApps = (appsId && (scheduleDivId === appsId)) || schedule.division === 'Apps';
    if (isTS && isScheduleApps) return true;

    const isInfra = (infraId && (user.division_id === infraId || user.division === infraId)) || user.division === 'Infra';
    const isScheduleFZ = (fzId && (scheduleDivId === fzId)) || schedule.division === 'Fiberzone';
    if (isInfra && isScheduleFZ) return true;

    return false;
  };

  const handleAddScheduleFromSummary = () => {
    setDailySummaryOpen(false);
    setOpenedFromSummary(true);
    setOpen(true);
  };

  const InvertedWeekViewWithZoom = useMemo(() => {
    const View = (props) => <InvertedWeekView {...props} zoomLevel={zoomLevel} />;
    View.title = InvertedWeekView.title;
    View.navigate = InvertedWeekView.navigate;
    return View;
  }, [zoomLevel]);

  const InvertedDayViewWithZoom = useMemo(() => {
    const View = (props) => <InvertedDayView {...props} zoomLevel={zoomLevel} />;
    View.title = InvertedDayView.title;
    View.navigate = InvertedDayView.navigate;
    return View;
  }, [zoomLevel]);

  const CustomToolbarWithZoom = useMemo(() => (props) => (
    <CustomToolbar {...props} onZoom={setZoomLevel} zoomLevel={zoomLevel} />
  ), [zoomLevel]);

  return (
    <div className="space-y-6" data-testid="schedule-page">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Schedule</h1>
          <p className="text-muted-foreground mb-4">
            {canEdit ? 'Manage team schedules' : 'View team schedules'}
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {canEdit && canEditPerm && (
            <>
              <BulkUploadDialog
                bulkUploadOpen={bulkUploadOpen} setBulkUploadOpen={setBulkUploadOpen}
                handleBulkUpload={handleBulkUpload} setUploadFile={setUploadFile}
                downloadTemplate={downloadTemplate}
              />

              {isHolidayAdmin && (
                <Button
                  onClick={() => setHolidayDialogOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  data-testid="manage-holidays-button"
                >
                  <CalendarIcon size={18} className="mr-2" />
                  Manage Holidays
                </Button>
              )}

              <Button
                onClick={() => setExportOpen(true)}
                variant="outline"
                className="border-gray-300"
                data-testid="export-csv-button"
              >
                <Download size={18} className="mr-2" />
                Export CSV
              </Button>

              <Button
                onClick={() => {
                  setOpenedFromSummary(false);
                  setOpen(true);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white"
                data-testid="create-schedule-button"
              >
                <Plus size={18} className="mr-2" />
                Create Schedule
              </Button>

              <CreateScheduleDialog
                open={open}
                onOpenChange={setOpen}
                user={user}
                users={eligibleUsers}
                sites={sites}
                categories={categories}
                onScheduleCreated={fetchSchedules}
                openedFromSummary={openedFromSummary}
                setOpenedFromSummary={setOpenedFromSummary}
                setDailySummaryOpen={setDailySummaryOpen}
                selectedDate={selectedDate}
              />
            </>
          )}
        </div>
      </div>

      {/* Dynamic Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
        <DynamicFilter
          activeFilters={activeFilters}
          onChange={setActiveFilters}
          filterFields={SCHEDULE_FILTER_FIELDS}
          fieldsContext={{
            users: users,
            sites: sites
          }}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Column */}
        <div className="w-full lg:w-[65%] xl:w-[70%]">
          <div className="bg-slate-900/50 rounded-xl p-6 shadow-lg border border-slate-700" data-testid="calendar-view">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              selectable
              onSelectSlot={handleSelectSlot}
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              view={view}
              onView={setView}
              date={date}
              onNavigate={handleNavigate}
              onDrillDown={showDailySummary} // Restore daily summary on date click
              onSelectEvent={(event) => handleScheduleClick(event.resource)}
              views={{ month: true, week: InvertedWeekViewWithZoom, day: InvertedDayViewWithZoom }}
              components={{
                toolbar: CustomToolbarWithZoom
              }}
            />
          </div>
        </div>

        {/* Today's Schedule Column */}
        <div className="w-full lg:w-[35%] xl:w-[30%]">
          <div className="bg-card rounded-xl p-6 shadow-lg border border-border flex flex-col h-[748px]">
            <h2 className="text-xl font-bold text-foreground mb-4 sticky top-0 bg-card z-10 pb-2">
              Today's Schedules
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({moment().format('MMMM DD, YYYY')})
              </span>
            </h2>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
              {(() => {
                // Filter for today's schedules
                const today = moment().startOf('day');
                const todaySchedules = filteredSchedules.filter(schedule => {
                  const scheduleStart = moment(schedule.start_date).startOf('day');
                  const scheduleEnd = schedule.end_date ? moment(schedule.end_date).startOf('day') : scheduleStart;
                  return today.isBetween(scheduleStart, scheduleEnd, null, '[]');
                });

                if (todaySchedules.length === 0) {
                  return (
                    <p className="text-muted-foreground text-center py-8">
                      No schedules for today
                    </p>
                  );
                }

                return todaySchedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {schedule.title}{schedule.site_name ? ` - ${schedule.site_name}` : ''}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {schedule.user_name} ({schedule.division})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {moment(schedule.start_date).format('MMM DD, YYYY HH:mm')}
                      </p>
                      {schedule.created_by_name && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">Created by: {schedule.created_by_name}</p>
                      )}
                    </div>
                    {/* PHASE 2: Edit and Delete buttons for Manager/SPV (division restricted) */}
                    {canModifySchedule(schedule) && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                          className="text-gray-400 border-gray-500 hover:bg-gray-800"
                          data-testid={`edit-schedule-${schedule.id}`}
                        >
                          <Edit size={16} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-400 border-red-400 hover:bg-red-900/20"
                          data-testid={`delete-schedule-${schedule.id}`}
                        >
                          <Trash2 size={16} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        editOpen={editOpen} setEditOpen={setEditOpen}
        handleUpdate={handleUpdate} handleDelete={handleDelete}
        editFormData={editFormData} setEditFormData={setEditFormData}
        categories={categories} isShiftSelected={isShiftSelected}
        selectedSchedule={selectedSchedule} canModifySchedule={canModifySchedule}
        users={eligibleUsers} sites={sites}
      />

      {/* Daily Summary Dialog */}
      <DailySummaryDialog
        dailySummaryOpen={dailySummaryOpen} setDailySummaryOpen={setDailySummaryOpen}
        selectedDate={selectedDate} currentHoliday={currentHoliday}
        morningBriefingUrl={morningBriefingUrl} setShowPdfPreview={setShowPdfPreview}
        currentDailySchedules={currentDailySchedules} getStatusBadge={getStatusBadge}
        eventStyleGetter={eventStyleGetter} handleEdit={handleEdit}
        handleDelete={handleDelete} canModifySchedule={canModifySchedule}
        handleScheduleClick={handleScheduleClick} canEdit={canEdit}
        handleAddScheduleFromSummary={handleAddScheduleFromSummary}
        users={eligibleUsers}
      />

      <HolidayManagementDialog
        holidayDialogOpen={holidayDialogOpen} setHolidayDialogOpen={setHolidayDialogOpen}
        holidays={holidays} setEditingHoliday={setEditingHoliday}
        setHolidayFormData={setHolidayFormData} setHolidayFormOpen={setHolidayFormOpen}
        handleDeleteHoliday={handleDeleteHoliday}
        currentDate={date}
      />

      {/* Holiday Add/Edit Form Dialog */}
      <HolidayFormDialog
        holidayFormOpen={holidayFormOpen} setHolidayFormOpen={setHolidayFormOpen}
        editingHoliday={editingHoliday} handleHolidaySubmit={handleHolidaySubmit}
        holidayFormData={holidayFormData} setHolidayFormData={setHolidayFormData}
      />

      {/* Activity Detail Dialog */}
      <Dialog open={activityDetailOpen} onOpenChange={setActivityDetailOpen}>
        <DialogContent className="max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>Current status and progress updates.</DialogDescription>
          </DialogHeader>

          {selectedScheduleForActivity && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary rounded-lg border border-border">
                <h3 className="font-semibold text-lg text-foreground">{selectedScheduleForActivity.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{selectedScheduleForActivity.user_name} ({selectedScheduleForActivity.division})</p>
                {activityData ? getStatusBadge(activityData.status) : getStatusBadge('Pending')}
                {selectedScheduleForActivity.created_by_name && (
                  <p className="text-[11px] text-muted-foreground/70 mt-2">Created by: {selectedScheduleForActivity.created_by_name}</p>
                )}
              </div>

              {loadingActivity ? (
                <div className="text-center py-4 text-muted-foreground">Loading activity details...</div>
              ) : activityData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-muted-foreground block">Start Time</span>
                      <div className="flex items-center">
                        <span className="text-foreground">{activityData.start_time ? moment(activityData.start_time).format('HH:mm') : '-'}</span>
                        {activityData.start_lat && activityData.start_lng && (
                          <a
                            href={`https://www.google.com/maps?q=${activityData.start_lat},${activityData.start_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center text-gray-400 hover:text-gray-300"
                            title="View Start Location"
                          >
                            <MapPin size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground block">Finish Time</span>
                      <div className="flex items-center">
                        <span className="text-foreground">{activityData.finish_time ? moment(activityData.finish_time).format('HH:mm') : '-'}</span>
                        {activityData.finish_lat && activityData.finish_lng && (
                          <a
                            href={`https://www.google.com/maps?q=${activityData.finish_lat},${activityData.finish_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center text-gray-400 hover:text-gray-300"
                            title="View Finish Location"
                          >
                            <MapPin size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>



                  {activityData.progress_updates && activityData.progress_updates.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center">
                        <MessageSquare size={14} className="mr-1" /> Progress Updates
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {activityData.progress_updates.map((update, idx) => (
                          <div key={idx} className={`text-sm border p-2 rounded shadow-sm ${update.is_auto ? 'bg-secondary/30 border-secondary/50 text-muted-foreground' : 'bg-secondary/50 border-border'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                {update.is_auto && <RotateCcw size={10} className="inline mr-1 text-muted-foreground" />}
                                <span>{update.update_text}</span>
                                {update.image_url || update.image_data ? (
                                  <div className="mt-2">
                                    <img
                                      src={update.image_url
                                        ? `${process.env.REACT_APP_API_URL}${update.image_url}`
                                        : `data:image/jpeg;base64,${update.image_data}`}
                                      alt="Update attachment"
                                      className="max-h-40 rounded border border-slate-200 cursor-pointer hover:opacity-90"
                                      onClick={() => setPreviewImage(
                                        update.image_url
                                          ? `${process.env.REACT_APP_API_URL}${update.image_url}`
                                          : `data:image/jpeg;base64,${update.image_data}`
                                      )}
                                    />
                                  </div>
                                ) : null}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 flex flex-col items-end">
                                <span>{moment(update.timestamp).format('HH:mm')}</span>
                                {update.latitude && update.longitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${update.latitude},${update.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-muted-foreground hover:text-foreground mt-1"
                                    title="View Location"
                                  >
                                    <MapPin size={10} className="mr-0.5" />
                                    <span className="text-[10px]">Map</span>
                                  </a>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground italic">
                  No activity recorded yet.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
          <div className="relative flex justify-center items-center h-full">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 bg-background/50 text-foreground p-2 rounded-full hover:bg-background/80 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-1" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="px-4 py-2 border-b">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="text-blue-500" size={20} />
              <span>Morning Briefing Preview</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-slate-100 rounded-b-lg overflow-hidden">
            {morningBriefingUrl ? (
              <iframe
                src={`${process.env.REACT_APP_API_URL}${morningBriefingUrl}#toolbar=0`}
                className="w-full h-full border-none"
                title="Morning Briefing PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 italic">
                No preview available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Export Schedule to CSV</DialogTitle>
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
            <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white">
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Schedule;
