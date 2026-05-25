import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCanEdit } from '../context/PermissionContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, ArrowUpDown, Pencil, Trash2, Download, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { cn } from '../lib/utils';
import SiteCombobox from '../components/SiteCombobox';
import { DynamicFilter } from '../components/DynamicFilter';
import { SearchableSelectCombobox } from '../components/SelectionComponents';

const API = `${process.env.REACT_APP_API_URL}/api`;

const Tickets = () => {
  const { user, isTechOps } = useAuth();
  const canEditPerm = useCanEdit('tickets');
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all'); // 'all', 'open' or 'closed'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to_division: 'Monitoring',
    assigned_to_division_id: '',
    site_id: undefined,
    ticket_number: '',
    link: '',
    category: '',
    next_action: ''
  });
  const [departments, setDepartments] = useState([]);

  const TICKET_FILTER_FIELDS = useMemo(() => ({
    category: {
      label: 'Category',
      type: 'select',
      options: ['FOKMON', 'MAINTENANCE', 'WO BOD/UPGRADE', 'FYI', 'DOWN', 'RFO', 'FIBERZONE', 'VLEPO', 'FTTR', 'MEGALOS', 'EMAIL', 'INTERNET', 'ACCESS POINT', 'VIRTUAL', 'DEVICE', 'REPORT', 'REQUEST CLIENT']
    },
    site_id: { label: 'Site', type: 'site' },
    region: { label: 'Region', type: 'select', options: ['Region 1', 'Region 2', 'Region 3'] },
    status: {
      label: 'Status',
      type: 'select',
      options: ['INTERNAL', 'PENJADWALAN', 'BRIEFING', 'DISPATCH', 'FIBERZONE', 'DONE']
    },
    assigned_to_division: {
      label: 'Assign To',
      type: 'select',
      options: [
        ...(isTechOps ? ['Infra & Fiberzone', 'TS & Apps'] : []),
        ...departments.flatMap(d => d.divisions).filter((v, i, a) => a.indexOf(v) === i).sort()
      ]
    }
  }), [departments]);

  const divisionOptions = useMemo(() => {
    return departments.flatMap(d => d.divisions || []).filter((v, i, a) => a.indexOf(v) === i).sort();
  }, [departments]);

  // Pagination State
  const [searchParams, setSearchParams] = useSearchParams();
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const itemsPerPage = 15;
  const currentPage = useMemo(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page) : 1;
  }, [searchParams]);

  const updatePage = (newPage) => {
    const params = Object.fromEntries([...searchParams]);
    if (newPage <= 1) {
      delete params.page;
    } else {
      params.page = newPage.toString();
    }
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    fetchSites();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  // Handler functions to reset page on filter changes
  const handleFilterChange = (newFilters) => {
    setActiveFilters(newFilters);
    updatePage(1);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    updatePage(1);
  };

  const handleConditionChange = (condition) => {
    setConditionFilter(condition);
    updatePage(1);
  };

  const handleSortChange = (sort) => {
    setSortOrder(sort);
    updatePage(1);
  };

  useEffect(() => {
    fetchTickets(currentPage);
  }, [currentPage, activeFilters, searchQuery, conditionFilter, sortOrder]);

  // Helper to determine ticket age color
  const getTicketAgeColor = (createdAt, status) => {
    if (status === 'Closed') return 'hover:bg-muted/50';

    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now - createdDate) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'bg-blue-500/5 hover:bg-blue-500/10 border-l-4 border-l-blue-500';
    if (diffInHours < 3) return 'bg-yellow-500/5 hover:bg-yellow-500/10 border-l-4 border-l-yellow-500';
    return 'bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500';
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API}/tickets/${ticketId}`);
      toast.success('Ticket deleted successfully');
      fetchTickets(currentPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete ticket');
    }
  };

  const fetchTickets = async (page = 1) => {
    try {
      const params = {
        page,
        limit: itemsPerPage,
        sort: sortOrder
      };

      if (searchQuery) params.search = searchQuery;

      // Apply condition filter (open vs closed vs all)
      if (conditionFilter === 'closed') {
        params.status = 'Closed';
      } else if (conditionFilter === 'open') {
        params.exclude_closed = true;
      }

      // Apply active filters to params
      activeFilters.forEach(filter => {
        if (filter.value && filter.value !== 'all') {
          // If user picks a specific status filter, override the condition filter
          if (filter.field === 'status') {
            params.status = filter.value;
            delete params.exclude_closed;
          } else {
            params[filter.field] = filter.value;
          }
        }
      });

      const response = await axios.get(`${API}/tickets`, { params });

      if (response.data.items) {
        setTickets(response.data.items);
        setTotalPages(response.data.total_pages);
        setTotalTickets(response.data.total);
      } else {
        setTickets(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await axios.get(`${API}/sites`, { params: { limit: 1000 } });
      if (response.data.items) {
        setSites(response.data.items);
      } else {
        setSites(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = {};

      if (exportMonth) {
        params.export_month = exportMonth;
      }

      if (searchQuery) params.search = searchQuery;

      // Apply condition filter (open vs closed vs all)
      if (conditionFilter === 'closed') {
        params.status = 'Closed';
      } else if (conditionFilter === 'open') {
        params.exclude_closed = true;
      }

      // Apply active filters to params
      activeFilters.forEach(filter => {
        if (filter.value && filter.value !== 'all') {
          // If user picks a specific status filter, override the condition filter
          if (filter.field === 'status') {
            params.status = filter.value;
            delete params.exclude_closed;
          } else {
            params[filter.field] = filter.value;
          }
        }
      });

      const response = await axios.get(`${API}/tickets/export/csv`, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tickets_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (error) {
      console.error('Failed to export tickets:', error);
      toast.error('Failed to export tickets');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/tickets`, formData);
      toast.success('Ticket created successfully!');
      setOpen(false);
      fetchTickets(currentPage);
      setFormData({
        title: '',
        description: '',
        assigned_to_division: 'Monitoring',
        assigned_to_division_id: '',
        site_id: undefined,
        ticket_number: '',
        link: '',
        category: '',
        next_action: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create ticket');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'INTERNAL': 'bg-slate-100 text-slate-800 dark:bg-gray-700/50 dark:text-gray-300 border-transparent dark:border-gray-600',
      'PENJADWALAN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-transparent border-blue-800',
      'BRIEFING': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-transparent border-purple-800',
      'DISPATCH': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-transparent dark:border-yellow-800',
      'FIBERZONE': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-transparent border-orange-800',
      'DONE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-transparent border-green-800',
      'Open': 'bg-slate-100 text-slate-800 dark:bg-gray-700/50 dark:text-gray-300 border-transparent dark:border-gray-600',
      'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-transparent dark:border-yellow-800',
      'Closed': 'bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-gray-400 border-transparent dark:border-gray-700'
    };
    return colors[status] || 'bg-secondary text-muted-foreground';
  };

  const getDivisionColor = (division) => {
    const colors = {
      'Monitoring': 'bg-blue-500',
      'Infra': 'bg-purple-500',
      'TS': 'bg-green-500',
      'Internal Support': 'bg-cyan-500'
    };
    return colors[division] || 'bg-gray-500';
  };

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
    <div className="space-y-6" data-testid="tickets-page">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Ticket Management</h1>
          <p className="text-muted-foreground">Track and manage support tickets</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExportOpen(true)} className="border-border bg-background hover:bg-muted text-foreground" title="Export current tickets to CSV">
            <Download size={18} className="mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>Export Tickets</DialogTitle>
                <DialogDescription>Select a month to export tickets created in that month. Leave empty to export all currently filtered tickets.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Input
                    type="month"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
                <Button onClick={handleExportCSV} className="bg-primary text-primary-foreground hover:bg-primary/90">Download CSV</Button>
              </div>
            </DialogContent>
          </Dialog>

          {canEditPerm && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-500 hover:bg-red-600" data-testid="create-ticket-button">
                <Plus size={18} className="mr-2" />
                Create Ticket
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="ticket-dialog" className="bg-card border-border text-foreground max-w-[600px] w-[95vw] p-0 overflow-hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="text-foreground">Create New Ticket</DialogTitle>
                <DialogDescription className="text-muted-foreground">Fill in the details to create a new support ticket.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh] w-full overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 space-y-6 custom-scrollbar">
                  {/* Row 1: Site Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="site" className="text-foreground font-medium">Site Selection <span className="text-red-500">*</span></Label>
                    <SiteCombobox
                      sites={sites}
                      value={formData.site_id}
                      onChange={(val) => setFormData({ ...formData, site_id: val })}
                    />
                  </div>

                  {/* Row 2: Ticket Number | External Link */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket_number" className="text-foreground">Ticket Number</Label>
                      <Input
                        id="ticket_number"
                        value={formData.ticket_number}
                        onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
                        data-testid="ticket-number-input"
                        className="bg-background border-input text-foreground"
                        placeholder="Ticket#"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="link" className="text-foreground">External Link</Label>
                      <Input
                        id="link"
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        data-testid="ticket-link-input"
                        className="bg-background border-input text-foreground"
                        placeholder="URL (http...)"
                      />
                    </div>
                  </div>

                  {/* Row 3: Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-foreground font-medium">Description <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      data-testid="ticket-description-input"
                      className="bg-background border-input text-foreground min-h-[120px]"
                      placeholder="Detail issue di site (Mandatory)"
                      rows={5}
                    />
                  </div>

                  {/* Row 4: Category | Assign To */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Category</Label>
                      <SearchableSelectCombobox
                        options={TICKET_FILTER_FIELDS.category.options}
                        value={formData.category}
                        onChange={(value) => setFormData({ ...formData, category: value })}
                        placeholder="Select Category"
                        emptyText="No category found."
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Assign / Dispatch To</Label>
                      <SearchableSelectCombobox
                        options={divisionOptions}
                        value={formData.assigned_to_division}
                        onChange={(value) => {
                          const allDivs = departments.flatMap(d => d.divisions_data || []);
                          const selectedDiv = allDivs.find(d => d.name === value);
                          setFormData({ 
                            ...formData, 
                            assigned_to_division: value,
                            assigned_to_division_id: selectedDiv ? selectedDiv.id : ''
                          });
                        }}
                        placeholder="Select Division"
                        emptyText="No division found."
                        className="bg-background"
                      />
                    </div>
                  </div>

                  {/* Row 5: Next Action (Optional) */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="next_action" className="text-foreground">Next Action</Label>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
                    </div>
                    <Textarea
                      id="next_action"
                      value={formData.next_action}
                      onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                      data-testid="ticket-next-action-input"
                      className="bg-background border-input text-foreground min-h-[80px]"
                      placeholder="Input the first action or comment for this ticket..."
                    />
                  </div>

                  {/* Row 6: Title (Optional) */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="title" className="text-foreground">Title</Label>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
                    </div>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      data-testid="ticket-title-input"
                      className="bg-background border-input text-foreground"
                      placeholder="VLEPO/Internet/Waas Issue - Site X - 20/11/2025"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 px-6 py-4 mt-4 border-t border-border/50 bg-muted/20">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-red-500 hover:bg-red-600">
                    Create Ticket
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
        {/* Left: Dynamic Filters */}
        <div className="flex-1">
          <DynamicFilter
            activeFilters={activeFilters}
            onChange={handleFilterChange}
            filterFields={TICKET_FILTER_FIELDS}
            fieldsContext={{ sites }}
          />
        </div>

        {/* Right: Condition Toggle + Search & Sort */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Open / Closed / All Toggle */}
          <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleConditionChange('all')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-medium transition-all',
                conditionFilter === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleConditionChange('open')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-medium transition-all',
                conditionFilter === 'open'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleConditionChange('closed')}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-medium transition-all',
                conditionFilter === 'closed'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Closed
            </Button>
          </div>

          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-background border-input hover:border-ring focus:border-primary rounded-full transition-colors text-foreground h-9"
            />
          </div>

          <Select value={sortOrder} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[150px] bg-background border-input rounded-lg hover:bg-accent text-foreground h-9">
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pagination Controls (Top) */}
      {totalTickets > 0 && (
        <div className="flex items-center justify-between py-2 px-1">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalTickets)} of {totalTickets} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updatePage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updatePage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Tickets Table View */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow className="hover:bg-muted/50 border-b border-border">
              <TableHead className="w-[150px] text-muted-foreground font-medium">Site</TableHead>
              <TableHead className="w-[150px] text-muted-foreground font-medium">Ticket Number</TableHead>
              <TableHead className="text-muted-foreground font-medium">Description</TableHead>
              <TableHead className="w-[200px] text-muted-foreground font-medium">Next Action</TableHead>
              <TableHead className="w-[120px] text-muted-foreground font-medium text-center">Category</TableHead>
              <TableHead className="w-[150px] text-muted-foreground font-medium text-center">Date</TableHead>
              <TableHead className="w-[120px] text-muted-foreground font-medium text-center pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No tickets match your filters
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className={cn(
                    "border-b border-border group transition-colors",
                    getTicketAgeColor(ticket.created_at, ticket.status)
                  )}
                >
                  {/* Column 1: Site */}
                  <TableCell className="font-medium text-foreground">
                    {ticket.site_name || '-'}
                  </TableCell>

                  {/* Column 2: Ticket Number (Hyperlink) */}
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

                  {/* Column 3: Description (Clickable to Detail) */}
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
                              <p className="text-sm font-medium text-foreground group-hover/desc:text-primary transition-colors line-clamp-2">
                                {ticket.description}
                              </p>
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                                Open details in new tab
                              </span>
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

                  {/* Column 4: Next Action */}
                  <TableCell className="text-foreground max-w-[200px]">
                    {ticket.latest_comment ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help group/comment">
                              <MessageSquare size={14} className="text-muted-foreground shrink-0 group-hover/comment:text-primary transition-colors" />
                              <p className="text-sm truncate">
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
                      <span className="text-muted-foreground/40 text-xs italic">No actions recorded</span>
                    )}
                  </TableCell>

                  {/* Column 5: Category */}
                  <TableCell className="text-center">
                    {ticket.category ? (
                      <Badge variant="outline" className={cn("border-transparent font-medium text-[10px] px-2", getCategoryColor(ticket.category))}>
                        {ticket.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Column 6: Date */}
                  <TableCell className="text-center text-muted-foreground whitespace-nowrap">
                    <div className="text-xs">{new Date(ticket.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px] opacity-70">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </TableCell>

                  {/* Column 7: Status */}
                  <TableCell className="text-center pr-6">
                    <Badge className={cn("min-w-[80px] justify-center shadow-none text-[10px] py-0 h-5", getStatusColor(ticket.status))}>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination removed from bottom */}
    </div >
  );
};

export default Tickets;
