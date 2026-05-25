import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
    Clock, 
    CheckCircle2, 
    Trash2, 
    Settings,
    Play,
    Check
} from 'lucide-react';

export const WorkOrderActions = ({ 
    wo, 
    canDelete, 
    handleStatusChange, 
    handleDeleteWO 
}) => {
    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Settings className="text-slate-400" size={20} />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Update status</p>
                    
                    {wo.status === 'Created' && (
                        <Button 
                            className="w-full bg-[#9AD872] hover:bg-[#8bc964] text-white font-bold h-11 flex items-center justify-center gap-2 border-b-4 border-[#76a15a] active:border-b-0 active:translate-y-1 transition-all"
                            onClick={() => handleStatusChange('On Progress')}
                        >
                            <Play size={18} />
                            Start Work Order
                        </Button>
                    )}

                    {wo.status === 'On Progress' && (
                        <Button 
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold h-11 flex items-center justify-center gap-2 border-b-4 border-purple-700 active:border-b-0 active:translate-y-1 transition-all"
                            onClick={() => handleStatusChange('Teknis Stage')}
                        >
                            <Clock size={18} />
                            Move to Teknis Stage
                        </Button>
                    )}

                    {(wo.status === 'On Progress' || wo.status === 'Teknis Stage') && (
                        <Button 
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-11 flex items-center justify-center gap-2 border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all"
                            onClick={() => handleStatusChange('Done')}
                        >
                            <Check size={18} />
                            Mark as Done
                        </Button>
                    )}

                    {wo.status === 'Done' && (
                        <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex flex-col items-center text-center gap-2">
                            <CheckCircle2 className="text-green-500" size={32} />
                            <p className="text-sm font-bold text-green-700">This Work Order is completed</p>
                            <p className="text-xs text-green-600/70">No further actions required</p>
                        </div>
                    )}
                </div>

                {canDelete && (
                    <div className="pt-4 border-t border-border mt-4">
                        <Button 
                            variant="ghost" 
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 font-bold h-11 flex items-center justify-center gap-2"
                            onClick={() => handleDeleteWO(wo.id)}
                        >
                            <Trash2 size={18} />
                            Delete Work Order
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
