import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus, Edit, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_API_URL}/api`;

const DepartmentManagement = () => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [formData, setFormData] = useState({ name: '', divisions: [] });
    const [newDivision, setNewDivision] = useState('');

    useEffect(() => {
        if (user?.role === 'SuperUser') {
            fetchDepartments();
        }
    }, [user]);

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
        if (!formData.name.trim()) {
            toast.error('Department name is required');
            return;
        }

        try {
            if (editingDept) {
                await axios.put(`${API}/departments/${editingDept.id}`, formData);
                toast.success('Department updated successfully');
            } else {
                await axios.post(`${API}/departments`, formData);
                toast.success('Department created successfully');
            }
            setIsDialogOpen(false);
            fetchDepartments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save department');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await axios.delete(`${API}/departments/${id}`);
            toast.success('Department deleted');
            fetchDepartments();
        } catch (error) {
            toast.error('Failed to delete department');
        }
    };

    if (user?.role !== 'SuperUser') {
        return <div className="text-center mt-10">Access Denied. SuperUser only.</div>;
    }

    if (loading) {
        return <div className="flex justify-center p-8">Loading...</div>;
    }

    return (
        <div className="space-y-6 fade-in" data-testid="department-management-page">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Departments & Divisions</h1>
                    <p className="text-muted-foreground">Manage organization structure</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                    <Plus size={16} className="mr-2" /> Add Department
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => (
                    <Card key={dept.id} className="hover:shadow-lg transition-shadow bg-card border-border">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-xl font-bold">{dept.name}</CardTitle>
                                <CardDescription className="mt-1">{dept.divisions.length} divisions</CardDescription>
                            </div>
                            <div className="flex space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(dept)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                    <Edit size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id, dept.name)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {dept.divisions.map(div => (
                                    <Badge key={div} variant="secondary" className="bg-secondary text-secondary-foreground">
                                        {div}
                                    </Badge>
                                ))}
                                {dept.divisions.length === 0 && <span className="text-sm text-muted-foreground italic">No divisions defined.</span>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {departments.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                        No departments found. Click "Add Department" to create one.
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
                        <DialogDescription>
                            Configure the department name and its divisions.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Department Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Technical Operation"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Divisions</Label>
                            <div className="flex space-x-2">
                                <Input
                                    value={newDivision}
                                    onChange={(e) => setNewDivision(e.target.value)}
                                    placeholder="Add division..."
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddDivision();
                                        }
                                    }}
                                />
                                <Button type="button" variant="secondary" onClick={handleAddDivision}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/40 rounded-lg min-h-[60px] border border-border/50">
                                {formData.divisions.map(div => (
                                    <Badge key={div} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1 group bg-background border shadow-sm">
                                        {div}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDivision(div)}
                                            className="hover:bg-destructive/10 rounded-full p-0.5 text-muted-foreground group-hover:text-destructive transition-colors ml-1"
                                        >
                                            <X size={12} />
                                        </button>
                                    </Badge>
                                ))}
                                {formData.divisions.length === 0 && <span className="text-xs text-muted-foreground self-center">No divisions added yet.</span>}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Department</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DepartmentManagement;
