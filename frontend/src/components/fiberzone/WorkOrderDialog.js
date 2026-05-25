import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import SiteCombobox from "../SiteCombobox";

const API = `${process.env.REACT_APP_API_URL}/api`;

const ACTIVITIES = [
    { id: 'TARIK', label: 'TARIK' },
    { id: 'AKTIVASI', label: 'AKTIVASI' },
    { id: 'TROUBLESHOOT', label: 'TROUBLESHOOT' },
    { id: 'VISIT', label: 'VISIT' },
    { id: 'CCTV', label: 'CCTV' },
    { id: 'MAINTENANCE', label: 'MAINTENANCE' },
];

const PACKAGES = [
    "Basic 50Mbps",
    "Geekly 70Mbps",
    "Mini FIberzone 15Mbps",
    "Premium Speed 200Mbps",
    "Super Speed 350Mbps",
    "Ultra Speed 500Mbps",
    "Surf 30Mbps",
    "Dive 50Mbps",
    "Explore 50Mbps",
    "Sail 100Mbps"
];

export default function WorkOrderDialog({ open, onOpenChange, wo, onSuccess }) {
    const [formData, setFormData] = useState({
        ticket_number: '',
        site_id: '',
        pop: '',
        package: '',
        activity: [],
        sn_ont: '',
        username_wo: '',
        password_wo: '',
        gpon: '',
        status: 'Created',
        assigned_to: '',
        assigned_to_name: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get(`${API}/users/by-division/Fiberzone`);
                setUsers(response.data);
            } catch (error) {
                console.error("Failed to fetch Fiberzone users", error);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (wo) {
            setFormData({
                ticket_number: wo.ticket_number || '',
                site_id: wo.site_id || '',
                pop: wo.pop || '',
                package: wo.package || '',
                activity: wo.activity || [],
                sn_ont: wo.sn_ont || '',
                username_wo: wo.username_wo || '',
                password_wo: wo.password_wo || '',
                gpon: wo.gpon || '',
                status: wo.status || 'Created',
                assigned_to: wo.assigned_to || '',
                assigned_to_name: wo.assigned_to_name || '',
                notes: wo.notes || ''
            });
        } else {
            setFormData({
                ticket_number: '',
                site_id: '',
                pop: '',
                package: '',
                activity: [],
                sn_ont: '',
                username_wo: '',
                password_wo: '',
                gpon: '',
                status: 'Created',
                assigned_to: '',
                assigned_to_name: '',
                notes: ''
            });
        }
    }, [wo, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.site_id || !formData.ticket_number) {
            toast.error("Please fill in required fields (Ticket Number & Site)");
            return;
        }

        setLoading(true);
        try {
            if (wo) {
                await axios.put(`${API}/work-orders/${wo.id}`, formData);
                toast.success("Work Order updated successfully");
            } else {
                await axios.post(`${API}/work-orders`, formData);
                toast.success("Work Order created successfully");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to save Work Order");
        } finally {
            setLoading(false);
        }
    };

    const handleActivityChange = (activityId, checked) => {
        setFormData(prev => {
            const newActivities = checked
                ? [...prev.activity, activityId]
                : prev.activity.filter(a => a !== activityId);
            return { ...prev, activity: newActivities };
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-full max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <div className="p-6 pb-4 border-b">
                    <DialogTitle className="text-xl font-bold">{wo ? 'Edit Work Order' : 'Create New Work Order'}</DialogTitle>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ticket_number">Ticket Number</Label>
                                    <Input
                                        id="ticket_number"
                                        value={formData.ticket_number}
                                        onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
                                        placeholder="TKT-XXXX"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Site (Fiberzone Only)</Label>
                                    <SiteCombobox
                                        value={formData.site_id}
                                        onChange={(siteId) => setFormData({ ...formData, site_id: siteId })}
                                        fiberzoneOnly={true}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pop">POP</Label>
                                    <Input
                                        id="pop"
                                        value={formData.pop}
                                        onChange={(e) => setFormData({ ...formData, pop: e.target.value })}
                                        placeholder="POP Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="package">Package</Label>
                                    <Select
                                        value={formData.package}
                                        onValueChange={(val) => setFormData({ ...formData, package: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Package" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PACKAGES.map((pkg) => (
                                                <SelectItem key={pkg} value={pkg}>
                                                    {pkg}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Activity</Label>
                                <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                                    {ACTIVITIES.map((activity) => (
                                        <div key={activity.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`activity-${activity.id}`}
                                                checked={formData.activity.includes(activity.id)}
                                                onCheckedChange={(checked) => handleActivityChange(activity.id, !!checked)}
                                            />
                                            <Label htmlFor={`activity-${activity.id}`} className="text-sm font-normal cursor-pointer">
                                                {activity.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sn_ont">SN ONT</Label>
                                    <Input
                                        id="sn_ont"
                                        value={formData.sn_ont}
                                        onChange={(e) => setFormData({ ...formData, sn_ont: e.target.value })}
                                        placeholder="Serial Number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gpon">GPON</Label>
                                    <Input
                                        id="gpon"
                                        value={formData.gpon}
                                        onChange={(e) => setFormData({ ...formData, gpon: e.target.value })}
                                        placeholder="GPON Port"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username_wo">Username</Label>
                                    <Input
                                        id="username_wo"
                                        value={formData.username_wo}
                                        onChange={(e) => setFormData({ ...formData, username_wo: e.target.value })}
                                        placeholder="PPPoE Username"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password_wo">Password</Label>
                                    <Input
                                        id="password_wo"
                                        value={formData.password_wo}
                                        onChange={(e) => setFormData({ ...formData, password_wo: e.target.value })}
                                        placeholder="Password"
                                        type="text"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assigned_to">Assign to (Fiberzone Division)</Label>
                                <Select
                                    value={formData.assigned_to}
                                    onValueChange={(val) => {
                                        const user = users.find(u => u.id === val);
                                        setFormData({
                                            ...formData,
                                            assigned_to: val,
                                            assigned_to_name: user ? user.username : ''
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select User to Assign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Assignment</SelectItem>
                                        {users.map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.username}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Input
                                    id="notes"
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional notes for teknis..."
                                />
                            </div>

                            {wo && (
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val) => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Created">Created</SelectItem>
                                            <SelectItem value="On Progress">On Progress</SelectItem>
                                            <SelectItem value="Teknis Stage">Teknis Stage</SelectItem>
                                            <SelectItem value="Done">Done</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-t bg-muted/20">
                        <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold shadow-lg">
                            {loading ? "Saving..." : (wo ? "Update Work Order" : "Create Work Order")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
