import React from 'react';
import { Link } from 'react-router-dom';

export const SchedulesCard = ({ schedulesToday, weeklyCounts }) => {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden" data-testid="schedules-card">
            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Persons on Schedule</h3>
                <p className="text-gray-400 font-medium text-sm">Today</p>
            </div>

            <div className="mb-4 flex flex-col items-center">
                <span className="text-6xl font-extrabold text-foreground">{schedulesToday?.length || 0}</span>
            </div>

            <div className="mt-auto">
                <h4 className="text-gray-400 font-bold text-[10px] uppercase mb-3">Daily Counts (This Week)</h4>
                <div className="flex justify-between items-end gap-1">
                    {weeklyCounts?.map((day, index) => (
                        <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                            <div className={`w-full flex flex-col items-center p-1.5 rounded-lg border transition-all ${day.is_today ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-900 border-gray-100'}`}>
                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">{day.day}</span>
                                <span className="text-sm font-extrabold">{day.date}</span>
                            </div>
                            <span className={`mt-1 text-sm font-bold ${day.is_today ? 'text-primary' : 'text-gray-900'}`}>{day.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 text-center">
                <Link to="/scheduler" className="text-gray-400 hover:text-gray-900 font-bold text-sm transition-colors uppercase tracking-wider">
                    View detail
                </Link>
            </div>
        </div>
    );
};
