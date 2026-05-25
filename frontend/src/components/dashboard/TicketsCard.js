import React from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';

export const TicketsCard = ({ openTickets }) => {
    const getPriorityStyles = (priority) => {
        switch (priority) {
            case 'High':
                return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]';
            case 'Medium':
                return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
            case 'Low':
                return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getTicketAgeColor = (ticket) => {
        const createdAt = moment(ticket.created_at);
        const now = moment();
        const hours = now.diff(createdAt, 'hours');

        if (hours < 1) return 'bg-blue-50/50';
        if (hours >= 1 && hours < 3) return 'bg-yellow-50/50';
        if (hours >= 3) return 'bg-red-50/50';
        
        return 'bg-white';
    };

    const displayTickets = openTickets.slice(0, 5);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden" data-testid="tickets-card">
            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Open Tickets</h3>
                <p className="text-gray-400 font-medium text-sm">Active Issues</p>
            </div>
            
            <div className="mb-4 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold text-foreground">{openTickets.length}</span>
            </div>

            <div className="flex-1 bg-[#F9FAFB] rounded-2xl p-3 border border-gray-100 space-y-0.5 overflow-hidden">
                {openTickets.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No open tickets</p>
                ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                        {displayTickets.map((ticket, index) => (
                            <div 
                                key={ticket.id} 
                                className={`p-3 ${getTicketAgeColor(ticket)} ${index === 0 ? 'rounded-t-xl' : ''} ${index === displayTickets.length - 1 ? 'rounded-b-xl' : ''} border-b border-gray-50 last:border-b-0 flex items-center justify-between transition-colors`}
                            >
                                <div className="flex flex-col space-y-1">
                                    <p className="font-bold text-gray-900 text-base leading-tight">{ticket.title}</p>
                                    <div className="flex items-center">
                                        <span className={`px-3 py-0.5 rounded-lg text-xs font-bold border ${getPriorityStyles(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                </div>
                                <Link to={`/tickets/${ticket.id}`}>
                                    <button className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors">
                                        Open
                                    </button>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 text-center">
                <Link to="/tickets" className="text-gray-400 hover:text-gray-900 font-bold text-base transition-colors">
                    View all
                </Link>
            </div>
        </div>
    );
};
