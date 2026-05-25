import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
    Trash2, Plus, Edit, X, Settings2, Tag, Building2,
    Shield, Save, Info, AlertTriangle, Network
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn } from '../lib/utils';

const API = `${process.env.REACT_APP_API_URL}/api`;

const Configuration = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    // SuperUser check
    if (user?.role !== 'SuperUser') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Shield size={64} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
                <p className="text-gray-500">Only SuperUser can access site configuration.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">Configuration Hub</h1>
                    <p className="text-muted-foreground">Manage site-wide settings, categories, and organization structure</p>
                </div>
            </div>

            <Tabs defaultValue="general" className="w-full space-y-6" onValueChange={setActiveTab}>
                <TabsList className="bg-muted/50 p-1 border border-border/50">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Settings2 size={16} /> General Settings
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="flex items-center gap-2">
                        <Tag size={16} /> Activity Categories
                    </TabsTrigger>
                    <TabsTrigger value="departments" className="flex items-center gap-2">
                        <Building2 size={16} /> Departments
                    </TabsTrigger>
                    <TabsTrigger value="orgmappings" className="flex items-center gap-2">
                        <Network size={16} /> Org Mappings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <GeneralSettingsTab />
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <CategoriesTab />
                </TabsContent>

                <TabsContent value="departments" className="space-y-4">
                    <DepartmentsTab />
                </TabsContent>

                <TabsContent value="orgmappings" className="space-y-4">
                    <OrganizationMappingsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};

// ============ SUB-COMPONENTS ============

const GeneralSettingsTab = () => {
    const [settings, setSettings] = useState({
        ticket_notification_chat_id: '',
        fiberzone_notification_chat_id: '',
        ticket_notification_interval: 60,
        ticket_notification_categories: [],
        frontend_url: ''
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${API}/settings`);
            setSettings(response.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            await axios.patch(`${API}/settings`, settings);
            toast.success('Settings updated successfully');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="text-center py-10">Loading settings...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="text-primary" size={20} />
                        Telegram Notifications
                    </CardTitle>
                    <CardDescription>
                        Configure the Telegram Chat ID for ticket notifications.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="telegram_id">Ticket Notification Chat ID</Label>
                        <Input
                            id="telegram_id"
                            value={settings.ticket_notification_chat_id || ''}
                            onChange={(e) => setSettings({ ...settings, ticket_notification_chat_id: e.target.value })}
                            placeholder="e.g. -5124203401"
                        />
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Info size={12} /> This ID is used by the background cron job to send recurring open ticket notifications.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fiberzone_telegram_id">Fiberzone WO Notification Chat ID</Label>
                        <Input
                            id="fiberzone_telegram_id"
                            value={settings.fiberzone_notification_chat_id || ''}
                            onChange={(e) => setSettings({ ...settings, fiberzone_notification_chat_id: e.target.value })}
                            placeholder="e.g. -4567890123"
                        />
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Info size={12} /> This ID is used to send Fiberzone Work Order notifications and comments.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notification_interval">Ticket Notification Repeat Interval (Minutes)</Label>
                        <Input
                            id="notification_interval"
                            type="number"
                            value={settings.ticket_notification_interval || 60}
                            onChange={(e) => setSettings({ ...settings, ticket_notification_interval: parseInt(e.target.value) || 60 })}
                            placeholder="e.g. 60"
                        />
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Info size={12} /> How often (in minutes) the system should resend notifications for open tickets.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Label>Enabled Ticket Notification Categories</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                            {[
                                'FOKMON', 'MAINTENANCE', 'WO BOD/UPGRADE', 'FYI', 'DOWN',
                                'RFO', 'FIBERZONE', 'VLEPO', 'FTTR', 'MEGALOS',
                                'EMAIL', 'INTERNET', 'ACCESS POINT', 'VIRTUAL', 'DEVICE',
                                'REPORT', 'REQUEST CLIENT'
                            ].map(cat => (
                                <div
                                    key={cat}
                                    onClick={() => {
                                        const current = settings.ticket_notification_categories || [];
                                        const next = current.includes(cat)
                                            ? current.filter(c => c !== cat)
                                            : [...current, cat];
                                        setSettings({ ...settings, ticket_notification_categories: next });
                                    }}
                                    className={cn(
                                        "flex items-center justify-center px-2 py-1.5 rounded-md text-[10px] font-medium cursor-pointer transition-all border text-center",
                                        (settings.ticket_notification_categories || []).includes(cat)
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                    )}
                                >
                                    {cat}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info size={12} /> Only tickets in selected categories will trigger Telegram group notifications. Leave empty to notify for all.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="frontend_url">Frontend Base URL (for Documentation Link)</Label>
                        <Input
                            id="frontend_url"
                            value={settings.frontend_url || ''}
                            onChange={(e) => setSettings({ ...settings, frontend_url: e.target.value })}
                            placeholder="e.g. https://vlux.varnion.net.id:3002"
                        />
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Info size={12} /> Used to construct documentation links in Telegram notifications.
                        </p>
                    </div>

                    <div className="pt-2">
                        <Button onClick={handleUpdate} disabled={updating} className="w-full bg-primary hover:bg-primary/90">
                            {updating ? 'Saving...' : <><Save size={16} className="mr-2" /> Save Settings</>}
                        </Button>
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-amber-800 dark:text-amber-300">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} />
                            <span className="font-semibold text-xs uppercase">Warning</span>
                        </div>
                        <p className="text-xs">
                            Incorrect Chat ID will prevent notifications from being delivered. Ensure the bot is a member of the group/channel.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="text-primary" size={20} />
                        About Site Configuration
                    </CardTitle>
                    <CardDescription>
                        Site configurations are applied globally.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                    <p>
                        These settings allow you to customize core behaviors of the Vlux application without modifying the source code.
                    </p>
                    <p>
                        Changes made here take effect immediately for new notifications and processes.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

const CategoriesTab = () => {
    const [categories, setCategories] = useState([]);
    const [open, setOpen] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/activity-categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        setProcessing(true);
        try {
            await axios.post(`${API}/activity-categories`, { name: newCategory.trim() });
            toast.success('Category created!');
            setOpen(false);
            setNewCategory('');
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create category');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        try {
            await axios.delete(`${API}/activity-categories/${id}`);
            toast.success('Category removed');
            fetchCategories();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm overflow-hidden relative">
                <div className="relative z-10">
                    <CardTitle className="text-xl">Activity Categories</CardTitle>
                    <CardDescription>Manage types of work for scheduling and reporting</CardDescription>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 z-10"><Plus size={16} className="mr-1" /> Add Category</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Category</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Category Name</Label>
                                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Maintenance" autoFocus />
                            </div>
                            <Button type="submit" disabled={processing} className="w-full">
                                {processing ? 'Creating...' : 'Create Category'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading categories...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                        <Card key={cat.id} className="hover:border-primary/50 transition-colors group">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Tag size={18} />
                                    </div>
                                    <span className="font-medium text-lg">{cat.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(cat.id, cat.name)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {categories.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                            No categories found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const DepartmentsTab = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [formData, setFormData] = useState({ name: '', divisions: [] });
    const [newDivision, setNewDivision] = useState('');

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${API}/departments`);
            setDepartments(response.data);
        } catch (error) {
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (dept = null) => {
        if (dept) {
            setEditingDept(dept);
            setFormData({ name: dept.name, divisions: [...dept.divisions] });
        } else {
            setEditingDept(null);
            setFormData({ name: '', divisions: [] });
        }
        setNewDivision('');
        setIsDialogOpen(true);
    };

    const handleAddDivision = () => {
        if (!newDivision.trim()) return;
        if (formData.divisions.includes(newDivision.trim())) {
            toast.error('Division already exists');
            return;
        }
        setFormData({ ...formData, divisions: [...formData.divisions, newDivision.trim()] });
        setNewDivision('');
    };

    const handleRemoveDivision = (divToRemove) => {
        setFormData({ ...formData, divisions: formData.divisions.filter(d => d !== divToRemove) });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingDept) {
                await axios.put(`${API}/departments/${editingDept.id}`, formData);
                toast.success('Updated successfully');
            } else {
                await axios.post(`${API}/departments`, formData);
                toast.success('Created successfully');
            }
            setIsDialogOpen(false);
            fetchDepartments();
        } catch (error) {
            toast.error('Failed to save');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            await axios.delete(`${API}/departments/${id}`);
            toast.success('Deleted');
            fetchDepartments();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                <div>
                    <CardTitle className="text-xl">Organization Structure</CardTitle>
                    <CardDescription>Departments and their functional divisions</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                    <Plus size={16} className="mr-1" /> Add Department
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading departments...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {departments.map((dept) => (
                        <Card key={dept.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="text-primary" size={20} />
                                        <CardTitle className="text-xl">{dept.name}</CardTitle>
                                    </div>
                                    <CardDescription className="mt-1">{dept.divisions.length} divisions defined</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(dept)} className="text-primary hover:bg-primary/5">
                                        <Edit size={16} />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id, dept.name)} className="text-red-500 hover:bg-red-50">
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {dept.divisions.map(div => (
                                        <Badge key={div} variant="outline" className="bg-background">{div}</Badge>
                                    ))}
                                    {dept.divisions.length === 0 && <span className="text-sm text-muted-foreground italic">No divisions defined.</span>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {departments.length === 0 && <div className="col-span-full py-12 text-center border border-dashed rounded-xl">No departments found.</div>}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDept ? 'Edit' : 'Add'} Department</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Department Name</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Sales" />
                        </div>
                        <div className="space-y-2">
                            <Label>Divisions</Label>
                            <div className="flex gap-2">
                                <Input value={newDivision} onChange={(e) => setNewDivision(e.target.value)} placeholder="Add division..." />
                                <Button type="button" onClick={handleAddDivision}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 p-2 bg-muted/30 rounded-lg min-h-[40px]">
                                {formData.divisions.map(div => (
                                    <Badge key={div} className="flex gap-1 items-center">
                                        {div}
                                        <X size={12} className="cursor-pointer" onClick={() => handleRemoveDivision(div)} />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <Button type="submit" className="w-full">Save Changes</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const OrganizationMappingsTab = () => {
    const [departments, setDepartments] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [mappings, setMappings] = useState({
        tech_ops_department_id: '',
        manager_division_id: '',
        admin_division_id: '',
        fiberzone_division_ids: [],
        apps_division_id: '',
        infra_division_id: '',
        ts_division_id: '',
        sales_department_ids: []
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, divRes, orgRes] = await Promise.all([
                axios.get(`${API}/departments`),
                axios.get(`${API}/divisions`),
                axios.get(`${API}/organization/org-config`)
            ]);

            const depts = deptRes.data;
            setDepartments(depts);
            setDivisions(divRes.data);

            if (orgRes.data?.division_mappings) {
                const loadedMappings = orgRes.data.division_mappings;
                const resolvedMappings = { ...loadedMappings };

                // Auto-resolve legacy string names to new UUIDs
                Object.keys(resolvedMappings).forEach(key => {
                    const val = resolvedMappings[key];
                    if (val && typeof val === 'string' && val.length > 0) {
                        if (key.includes('department_id')) {
                            const dept = depts.find(d => d.name === val || d.id === val);
                            if (dept) resolvedMappings[key] = dept.id;
                        } else if (key.includes('division_id')) {
                            const div = divRes.data.find(d => d.name === val || d.id === val);
                            if (div) resolvedMappings[key] = div.id;
                        }
                    }
                });

                setMappings({
                    tech_ops_department_id: resolvedMappings.tech_ops_department_id || '',
                    manager_division_id: resolvedMappings.manager_division_id || '',
                    admin_division_id: resolvedMappings.admin_division_id || '',
                    fiberzone_division_ids: (() => {
                        // Multi-select array (new)
                        let ids = Array.isArray(resolvedMappings.fiberzone_division_ids)
                            ? [...resolvedMappings.fiberzone_division_ids]
                            : [];
                        // Auto-migrate legacy single field
                        const legacyId = resolvedMappings.fiberzone_division_id;
                        if (legacyId && !ids.includes(legacyId)) ids.push(legacyId);
                        return ids;
                    })(),
                    apps_division_id: resolvedMappings.apps_division_id || '',
                    infra_division_id: resolvedMappings.infra_division_id || '',
                    ts_division_id: resolvedMappings.ts_division_id || '',
                    sales_department_ids: (() => {
                        // Multi-select array (new)
                        let ids = Array.isArray(resolvedMappings.sales_department_ids)
                            ? [...resolvedMappings.sales_department_ids]
                            : [];
                        // Auto-migrate legacy single field
                        const legacyId = resolvedMappings.sales_department_id;
                        if (legacyId && !ids.includes(legacyId)) ids.push(legacyId);
                        return ids;
                    })()
                });
            }
        } catch (error) {
            console.error('Failed to fetch org data:', error);
            toast.error('Failed to load organization data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setUpdating(true);
        try {
            // Build payload: nullify empty strings, pass arrays as-is
            const payload = Object.fromEntries(
                Object.entries(mappings).map(([k, v]) => {
                    if (Array.isArray(v)) return [k, v];
                    return [k, v === '' ? null : v];
                })
            );
            await axios.post(`${API}/organization/org-config/mappings`, payload);
            toast.success('Organization mappings updated successfully');
        } catch (error) {
            console.error('Failed to save mappings:', error);
            toast.error('Failed to save organization mappings');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="text-center py-12">Loading organization data...</div>;

    return (
        <Card className="border-border shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Network className="text-primary" size={20} />
                    Dynamic Role & Access Mappings
                </CardTitle>
                <CardDescription>
                    Map specific logic functions to physical departments or divisions in your database.
                    This replaces hardcoded string checks like "Technical Operation" or "Fiberzone".
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Technical Operations Department</Label>
                        <Select
                            value={mappings.tech_ops_department_id}
                            onValueChange={(val) => setMappings({ ...mappings, tech_ops_department_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Grants full project settings access, special scheduling powers, and applies to project ticket assignments.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Sales Department Mapping <Badge variant="outline" className="ml-2 text-[10px]">Multi-Select</Badge></Label>
                        <p className="text-xs text-muted-foreground">
                            Select all departments that should follow Sales logic: restricted project visibility (only see assigned) and comment-only access for issues.
                        </p>
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 min-h-[44px]">
                            {(() => {
                                // Group departments by name to handle duplicates across branches/groups
                                const uniqueNames = [...new Set(departments.map(d => d.name))].sort();
                                return uniqueNames.map(name => {
                                    const relatedDepts = departments.filter(d => d.name === name);
                                    const relatedIds = relatedDepts.map(d => d.id);
                                    const isActive = relatedIds.some(id => (mappings.sales_department_ids || []).includes(id));

                                    return (
                                        <div
                                            key={name}
                                            onClick={() => {
                                                const current = mappings.sales_department_ids || [];
                                                let next;
                                                if (isActive) {
                                                    // Remove all IDs with this name
                                                    next = current.filter(id => !relatedIds.includes(id));
                                                } else {
                                                    // Add all IDs with this name
                                                    next = [...new Set([...current, ...relatedIds])];
                                                }
                                                setMappings({ ...mappings, sales_department_ids: next });
                                            }}
                                            className={cn(
                                                "flex items-center px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all border",
                                                isActive
                                                    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                                    : "bg-background text-muted-foreground border-border hover:border-blue-500/50"
                                            )}
                                        >
                                            {name}
                                        </div>
                                    );
                                });
                            })()}
                            {departments.length === 0 && <span className="text-xs text-muted-foreground italic">No departments found.</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Fiberzone Division Mapping <Badge variant="outline" className="ml-2 text-[10px]">Multi-Select</Badge></Label>
                        <p className="text-xs text-muted-foreground">
                            Select all divisions that should follow Fiberzone logic: dashboard redirect on login, Fiberzone schedule access, and Work Order assignment.
                        </p>
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 min-h-[44px]">
                            {(() => {
                                // Group divisions by name to handle duplicates across departments
                                const uniqueNames = [...new Set(divisions.map(d => d.name))].sort();
                                return uniqueNames.map(name => {
                                    const relatedDivs = divisions.filter(d => d.name === name);
                                    const relatedIds = relatedDivs.map(d => d.id);
                                    const isActive = relatedIds.some(id => (mappings.fiberzone_division_ids || []).includes(id));

                                    return (
                                        <div
                                            key={name}
                                            onClick={() => {
                                                const current = mappings.fiberzone_division_ids || [];
                                                let next;
                                                if (isActive) {
                                                    // Remove all IDs with this name
                                                    next = current.filter(id => !relatedIds.includes(id));
                                                } else {
                                                    // Add all IDs with this name
                                                    next = [...new Set([...current, ...relatedIds])];
                                                }
                                                setMappings({ ...mappings, fiberzone_division_ids: next });
                                            }}
                                            className={cn(
                                                "flex items-center px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all border",
                                                isActive
                                                    ? "bg-[#9AD872] text-white border-[#9AD872] shadow-sm"
                                                    : "bg-background text-muted-foreground border-border hover:border-[#9AD872]/50"
                                            )}
                                        >
                                            {name}
                                        </div>
                                    );
                                });
                            })()}
                            {divisions.length === 0 && <span className="text-xs text-muted-foreground italic">No divisions found.</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Admin Division (Technical Operations)</Label>
                        <Select
                            value={mappings.admin_division_id}
                            onValueChange={(val) => setMappings({ ...mappings, admin_division_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Division" />
                            </SelectTrigger>
                            <SelectContent>
                                {divisions.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Grants administrative powers over the selected Technical Operations Department projects and resources.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Apps Division</Label>
                        <Select
                            value={mappings.apps_division_id}
                            onValueChange={(val) => setMappings({ ...mappings, apps_division_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Division" />
                            </SelectTrigger>
                            <SelectContent>
                                {divisions.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Used for specialized reporting logic and legacy code constraints.
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                    <Button onClick={handleSave} disabled={updating} className="bg-primary hover:bg-primary/90">
                        {updating ? 'Saving Mappings...' : <><Save size={16} className="mr-2" /> Save Mappings</>}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default Configuration;
