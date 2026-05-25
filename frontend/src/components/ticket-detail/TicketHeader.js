import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft } from 'lucide-react';

export const TicketHeader = ({ ticket, navigate, getPriorityColor, getStatusColor }) => {
    return (
        <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate(-1)} data-testid="back-button">
                <ArrowLeft size={18} />
            </Button>
            <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">{ticket.title}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Created by {ticket.created_by_name} on {new Date(ticket.created_at).toLocaleDateString()} at {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status}
                </Badge>
            </div>
        </div>
    );
};
