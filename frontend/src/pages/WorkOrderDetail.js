import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// Modular Components
import { WorkOrderHeader } from '../components/fiberzone/detail/WorkOrderHeader';
import { WorkOrderDetailsCard } from '../components/fiberzone/detail/WorkOrderDetailsCard';
import { WorkOrderComments } from '../components/fiberzone/detail/WorkOrderComments';
import { WorkOrderActions } from '../components/fiberzone/detail/WorkOrderActions';
import WorkOrderDialog from '../components/fiberzone/WorkOrderDialog';

const API = `${process.env.REACT_APP_API_URL}/api`;

const WorkOrderDetail = () => {
    const { woId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [wo, setWo] = useState(null);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const fetchWorkOrder = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/work-orders/${woId}`);
            setWo(response.data);
        } catch (error) {
            toast.error('Failed to load Work Order');
            if (error.response?.status === 404) {
                navigate('/fiberzone/work-orders');
            }
        } finally {
            setLoading(false);
        }
    }, [woId, navigate]);

    useEffect(() => {
        fetchWorkOrder();
    }, [fetchWorkOrder]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        try {
            await axios.post(`${API}/work-orders/${woId}/comments`, { wo_id: woId, comment });
            toast.success('Comment added');
            setComment('');
            fetchWorkOrder();
        } catch (error) {
            toast.error('Failed to add comment');
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await axios.put(`${API}/work-orders/${woId}`, { status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
            fetchWorkOrder();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteWO = async (woId) => {
        if (!window.confirm('Are you sure you want to delete this Work Order? This action cannot be undone.')) {
            return;
        }
        try {
            await axios.delete(`${API}/work-orders/${woId}`);
            toast.success('Work Order deleted successfully');
            navigate('/fiberzone/work-orders');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete Work Order');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Created': 'bg-blue-100 text-blue-700 border-blue-200',
            'On Progress': 'bg-[#9AD872]/20 text-[#76a15a] border-[#9AD872]/30',
            'Teknis Stage': 'bg-purple-100 text-purple-700 border-purple-200',
            'Done': 'bg-green-100 text-green-700 border-green-200',
        };
        return colors[status] || 'bg-secondary text-muted-foreground';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#9AD872] border-t-transparent rounded-full animate-spin" />
                    <p className="text-lg text-muted-foreground font-medium">Loading Work Order...</p>
                </div>
            </div>
        );
    }

    if (!wo) return null;

    const canDelete = ['Admin', 'SuperUser', 'Manager', 'VP'].includes(user?.role);

    return (
        <div className="space-y-8 container mx-auto py-6" data-testid="work-order-detail-page">
            <WorkOrderHeader 
                wo={wo} 
                navigate={navigate} 
                getStatusColor={getStatusColor}
                onEdit={() => setIsEditDialogOpen(true)}
                canEdit={true}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <WorkOrderDetailsCard wo={wo} />
                    
                    <WorkOrderComments 
                        wo={wo}
                        comment={comment}
                        setComment={setComment}
                        handleAddComment={handleAddComment}
                    />
                </div>

                <div className="space-y-6">
                    <WorkOrderActions 
                        wo={wo}
                        canDelete={canDelete}
                        handleStatusChange={handleStatusChange}
                        handleDeleteWO={handleDeleteWO}
                    />
                </div>
            </div>

            <WorkOrderDialog 
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                wo={wo}
                onSuccess={fetchWorkOrder}
            />
        </div>
    );
};

export default WorkOrderDetail;
