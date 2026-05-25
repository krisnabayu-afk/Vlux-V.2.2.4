import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Briefcase, MapPin, Package, Cpu, Key, Radio, User } from 'lucide-react';

export const WorkOrderDetailsCard = ({ wo }) => {
    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Briefcase className="text-[#9AD872]" size={20} />
                    Work Order Information
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-muted p-2 rounded-lg">
                                <MapPin size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Site Name</p>
                                <p className="text-sm font-semibold">{wo.site_name}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-muted p-2 rounded-lg">
                                <Radio size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">POP / ODP</p>
                                <p className="text-sm font-semibold">{wo.pop}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-muted p-2 rounded-lg">
                                <Package size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Package</p>
                                <Badge variant="secondary" className="mt-1">
                                    {wo.package}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-muted p-2 rounded-lg">
                                <Cpu size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SN ONT / GPON</p>
                                <p className="text-sm font-mono font-bold text-[#76a15a] bg-[#9AD872]/5 px-2 py-0.5 rounded border border-[#9AD872]/20 inline-block">
                                    {wo.sn_ont} / {wo.gpon}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-muted p-2 rounded-lg">
                                <User size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username ONT</p>
                                <p className="text-sm font-mono">{wo.username_wo}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-muted p-2 rounded-lg">
                                <Key size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password ONT</p>
                                <p className="text-sm font-mono">{wo.password_wo}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {wo.notes && (
                    <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                            "{wo.notes}"
                        </p>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Activities Involved</p>
                    <div className="flex flex-wrap gap-2">
                        {wo.activity.map((act) => (
                            <Badge key={act} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none px-3 py-1">
                                {act}
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
