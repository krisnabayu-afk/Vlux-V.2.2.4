import React, { useMemo, useEffect, useRef } from 'react';
import moment from 'moment';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const EventWrapper = ({ event, eventPropGetter, onSelectEvent, zoomLevel = 100 }) => {
    const { style, className } = eventPropGetter(event) || {};
    const stickyOffset = 132 * (zoomLevel / 100);

    return (
        <div
            className={`text-xs p-0 rounded cursor-pointer relative h-full w-full overflow-visible ${className || ''}`}
            style={{
                ...style,
                color: style?.color || 'white',
                backgroundColor: style?.backgroundColor || '#3174ad',
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (onSelectEvent) onSelectEvent(event);
            }}
            title={`${event.resource?.user_name || 'Event'} - ${event.resource?.title || ''}${event.resource?.site_name ? ` (${event.resource.site_name})` : ''}`}
        >
            <div
                className="sticky w-fit h-full inline-flex flex-col justify-center px-2 py-1 overflow-hidden pointer-events-none"
                style={{ left: `${stickyOffset}px`, maxWidth: `calc(100% - ${stickyOffset}px)` }}
            >
                <span className="block font-semibold leading-tight truncate whitespace-nowrap">
                    {event.resource?.site_name
                        ? `${event.resource.site_name} - ${event.resource.user_name || event.title}`
                        : (event.resource?.user_name || event.title)
                    }
                </span>
            </div>
        </div>
    );
};

const InvertedViewGrid = ({ date, events, days, localizer, onSelectEvent, onSelectSlot, eventPropGetter, dayPropGetter, zoomLevel = 100 }) => {
    const scrollContainerRef = useRef(null);
    const hourWidth = 160 * (zoomLevel / 100);

    useEffect(() => {
        if (scrollContainerRef.current) {
            // Re-scroll to 9 AM when changing weeks/days, adjusted for zoom
            scrollContainerRef.current.scrollLeft = 9 * hourWidth;
        }
    }, [date, hourWidth]);

    // Memoize the time grid mapping to prevent excessive recalculations
    const gridData = useMemo(() => {
        const data = days.map((day) => {
            const dayStart = moment(day).startOf('day');
            const dayEnd = moment(day).endOf('day');

            // Filter events that fall on this day
            const dayEvents = events.filter((e) => {
                const eStart = moment(e.start);
                const eEnd = moment(e.end);
                return (eStart.isSameOrBefore(dayEnd) && eEnd.isSameOrAfter(dayStart));
            });

            // "One Event Per Row" logic: Every event gets its own lane
            const dayEventsSorted = [...dayEvents].sort((a, b) => new Date(a.start) - new Date(b.start));
            const lanes = dayEventsSorted.map(event => [event]);

            return {
                date: day,
                lanes,
                dayStart // pass dayStart for math later
            };
        });
        return data;
    }, [days, events]);

    return (
        <div ref={scrollContainerRef} className="w-full h-full border border-border bg-card rounded-lg overflow-auto text-sm [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full relative scroll-smooth">
            <div className="flex flex-col min-w-max">
                {/* Header - Horizontal Time Slots */}
                <div className="flex border-b border-border bg-muted sticky top-0 z-20">
                    <div className="w-32 flex-shrink-0 border-r border-border p-3 font-bold text-foreground dark:text-slate-100 flex items-center justify-center sticky left-0 bg-white dark:bg-slate-950 border-b border-r z-30 shadow-[1px_0_0_0_var(--border)]"
                        style={{ width: `${128 * (zoomLevel / 100)}px` }}>
                        Date
                    </div>
                    <div className="flex flex-1">
                        {HOURS.map((hour) => (
                            <div key={hour}
                                className="flex-shrink-0 border-r border-border p-2 text-center text-muted-foreground font-medium last:border-r-0"
                                style={{ width: `${hourWidth}px` }}>
                                {moment().hour(hour).minute(0).format('HH:mm')}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body - Vertical Dates and Event Grid */}
                <div className="flex flex-col z-0">
                    {gridData.map((row, rowIndex) => {
                        const { style: dayStyle, className: dayClassName } = dayPropGetter ? dayPropGetter(row.date) : {};
                        const isHoliday = !!dayClassName?.includes('bg-red-500/10');

                        return (
                            <div key={rowIndex}
                                className={`flex border-b border-border/60 min-h-[80px] hover:bg-muted/30 transition-colors group ${dayClassName || ''}`}
                                style={dayStyle}
                            >
                                <div className={`flex-shrink-0 border-r border-border p-3 text-foreground font-medium flex items-center justify-center sticky left-0 z-30 shadow-[1px_0_0_0_var(--border)] ${isHoliday ? 'bg-red-50 dark:bg-[#3d1a1a] !bg-opacity-100 group-hover:bg-red-100 dark:group-hover:bg-[#4d1a1a]' : 'bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900'}`}
                                    style={{ width: `${128 * (zoomLevel / 100)}px` }}
                                >
                                    <div className="text-center">
                                        <div className={`text-xs uppercase tracking-wider font-semibold ${isHoliday ? 'text-red-500 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}>{moment(row.date).format('ddd')}</div>
                                        <div className={`text-lg font-bold ${isHoliday ? 'text-red-700 dark:text-red-100' : 'text-slate-900 dark:text-slate-100'}`}>{moment(row.date).format('DD MMM')}</div>
                                    </div>
                                </div>

                                <div className="flex flex-1 relative min-w-max">
                                    {/* Background Grid Lines */}
                                    <div className="flex w-full absolute inset-0 pointer-events-none">
                                        {HOURS.map((hour) => (
                                            <div key={hour}
                                                className="flex-shrink-0 border-r border-border/50 h-full last:border-r-0"
                                                style={{ width: `${hourWidth}px` }}></div>
                                        ))}
                                    </div>

                                    {/* Event Lanes */}
                                    <div className="flex flex-col w-full relative z-10 py-2 px-1">
                                        {row.lanes.length === 0 ? (
                                            <div className="min-h-[64px]"></div>
                                        ) : (
                                            row.lanes.map((lane, laneIdx) => (
                                                <div key={laneIdx} className="relative min-h-[44px] w-full mb-1 last:mb-0">
                                                    {lane.map((event, idx) => {
                                                        const dayStart = row.dayStart;
                                                        const dayEnd = dayStart.clone().add(1, 'day');

                                                        const eStart = moment.max(dayStart, moment(event.start));
                                                        const eEnd = moment.min(dayEnd, moment(event.end));

                                                        const startMins = eStart.diff(dayStart, 'minutes');
                                                        const durationMins = eEnd.diff(eStart, 'minutes');

                                                        const left = startMins * (hourWidth / 60);
                                                        const width = Math.max(durationMins * (hourWidth / 60), 40); // min 40px width

                                                        return (
                                                            <div
                                                                key={`${event.id || idx}`}
                                                                className="absolute top-0 bottom-0 py-1 hover:z-20"
                                                                style={{ left: `${left}px`, width: `${width}px` }}
                                                            >
                                                                <div className="h-full w-full">
                                                                    <EventWrapper
                                                                        event={event}
                                                                        eventPropGetter={eventPropGetter}
                                                                        onSelectEvent={onSelectEvent}
                                                                        zoomLevel={zoomLevel}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Inverted Week View ---
export const InvertedWeekView = ({ date, localizer, events, onSelectEvent, onSelectSlot, eventPropGetter, dayPropGetter, zoomLevel = 100 }) => {
    const days = useMemo(() => {
        let start = moment(date).startOf('week'); // Respects locale's start of week (Sunday or Monday)
        return Array.from({ length: 7 }, (_, i) => moment(start).add(i, 'days').toDate());
    }, [date]);

    return (
        <InvertedViewGrid
            date={date}
            days={days}
            events={events}
            localizer={localizer}
            onSelectEvent={onSelectEvent}
            onSelectSlot={onSelectSlot}
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            zoomLevel={zoomLevel}
        />
    );
};

InvertedWeekView.title = (date, { localizer }) => {
    const start = moment(date).startOf('week');
    const end = moment(date).endOf('week');
    return `${start.format('MMMM DD')} - ${end.format('MMMM DD')}`;
};

InvertedWeekView.navigate = (date, action) => {
    switch (action) {
        case 'PREV':
            return moment(date).subtract(1, 'week').toDate();
        case 'NEXT':
            return moment(date).add(1, 'week').toDate();
        default:
            return date;
    }
};

// --- Inverted Day View ---
export const InvertedDayView = ({ date, localizer, events, onSelectEvent, onSelectSlot, eventPropGetter, dayPropGetter, zoomLevel = 100 }) => {
    const days = [date]; // Only one day

    return (
        <InvertedViewGrid
            date={date}
            days={days}
            events={events}
            localizer={localizer}
            onSelectEvent={onSelectEvent}
            onSelectSlot={onSelectSlot}
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            zoomLevel={zoomLevel}
        />
    );
};

InvertedDayView.title = (date) => {
    return moment(date).format('dddd, MMMM DD, YYYY');
};

InvertedDayView.navigate = (date, action) => {
    switch (action) {
        case 'PREV':
            return moment(date).subtract(1, 'day').toDate();
        case 'NEXT':
            return moment(date).add(1, 'day').toDate();
        default:
            return date;
    }
};
