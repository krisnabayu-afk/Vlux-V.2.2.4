import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, MapPin, ExternalLink, Activity, Cable } from 'lucide-react';

export const SiteHeader = ({ site, navigate, backUrl, isFiberzone }) => {
    if (!site) return null;

    const openExternalLink = (url) => {
        if (!url) return;
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = `http://${finalUrl}`;
        }
        window.open(finalUrl, '_blank');
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(backUrl || '/sites')}
                    className="rounded-full hover:bg-secondary"
                >
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
                            {site.name}
                        </h1>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            Site Detail
                        </Badge>
                        {site.fiberzone && (
                            <Badge className="bg-[#9AD872]/20 text-[#76a15a] border-[#9AD872]/30 uppercase font-bold">
                                Fiberzone
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                        <MapPin size={14} className="mr-1" />
                        <span className="text-sm font-medium">{site.location || 'Unknown Location'}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                {site.btest_link && (
                    <Button 
                        variant="outline" 
                        onClick={() => openExternalLink(site.btest_link)}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                    >
                        <Activity size={16} className="mr-2" />
                        To Btest
                    </Button>
                )}
                {site.fiberlink_link && (
                    <Button 
                        variant="outline" 
                        onClick={() => openExternalLink(site.fiberlink_link)}
                        className="bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                    >
                        <Cable size={16} className="mr-2" />
                        To Fiberlink
                    </Button>
                )}
            </div>
        </div>
    );
};
