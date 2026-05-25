import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ArrowLeft, Briefcase, Calendar, User, Edit } from 'lucide-react';

export const WorkOrderHeader = ({ wo, navigate, getStatusColor, onEdit, canEdit }) => {
    if (!wo) return null;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/fiberzone/work-orders')}
                    className="rounded-full hover:bg-secondary"
                >
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
                            WO: {wo.ticket_number}
                        </h1>
                        <Badge className={`font-semibold ${getStatusColor(wo.status)}`}>
                            {wo.status}
                        </Badge>
                        <Badge variant="outline" className="bg-[#9AD872]/10 text-[#76a15a] border-[#9AD872]/20">
                            Fiberzone
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
                        <div className="flex items-center">
                            <User size={14} className="mr-1" />
                            <span>Created by: {wo.created_by_name}</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            <span>{new Date(wo.created_at).toLocaleString()}</span>
                        </div>
                        {wo.assigned_to_name && (
                            <div className="flex items-center text-[#76a15a] font-bold bg-[#9AD872]/10 px-2 py-0.5 rounded">
                                <User size={14} className="mr-1" />
                                <span>Assigned to: {wo.assigned_to_name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {canEdit && (
                <Button 
                    onClick={onEdit}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm font-bold flex items-center gap-2"
                >
                    <Edit size={16} />
                    Edit Work Order
                </Button>
            )}
        </div>
    );
};
