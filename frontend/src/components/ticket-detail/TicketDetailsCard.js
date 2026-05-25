import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export const TicketDetailsCard = ({ ticket }) => {
    return (
        <Card data-testid="ticket-details" className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-foreground">Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <p className="font-semibold text-muted-foreground text-sm mb-1">Description</p>
                    <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <p className="font-semibold text-muted-foreground mb-1">Ticket Number:</p>
                        <p className="text-foreground">{ticket.ticket_number || '-'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground mb-1">Link:</p>
                        {ticket.link ? (
                            <a href={ticket.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center">
                                View Link
                            </a>
                        ) : (
                            <p className="text-foreground">-</p>
                        )}
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground mb-1">Category:</p>
                        <p className="text-foreground">{ticket.category || '-'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground mb-1">Site:</p>
                        <p className="text-foreground">{ticket.site_name || '-'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground mb-1">Regional:</p>
                        <p className="text-foreground">{ticket.region || ticket.site_region || '-'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground mb-1">Assigned To Division:</p>
                        <p className="text-foreground">{ticket.assigned_to_division}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground mb-1">Last Updated:</p>
                        <p className="text-foreground">{new Date(ticket.updated_at).toLocaleString()}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
