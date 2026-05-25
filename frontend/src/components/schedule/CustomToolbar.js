import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import moment from 'moment';
import { Search, Plus, Calendar as CalendarIcon, Edit, Trash2, Clock, Play, CheckCircle, XCircle, Pause, MapPin, MessageSquare, FileText, ZoomIn, ZoomOut } from 'lucide-react';

export const CustomToolbar = ({ date, onNavigate, onView, view, onZoom, zoomLevel }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(moment(date).year());
  const [selectedMonth, setSelectedMonth] = useState(moment(date).month());

  const handleZoomIn = () => {
    if (zoomLevel < 100) {
      onZoom(Math.min(100, zoomLevel + 20));
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 40) {
      onZoom(Math.max(40, zoomLevel - 20));
    }
  };

  const goToBack = () => {
    onNavigate('PREV');
  };

  const goToNext = () => {
    onNavigate('NEXT');
  };

  const goToToday = () => {
    onNavigate('TODAY');
  };

  const handleMonthYearClick = () => {
    setSelectedYear(moment(date).year());
    setSelectedMonth(moment(date).month());
    setShowDatePicker(!showDatePicker);
  };

  const handleDateSelect = () => {
    const newDate = moment().year(selectedYear).month(selectedMonth).toDate();
    onNavigate('DATE', newDate);
    setShowDatePicker(false);
  };

  const months = moment.months();
  const currentYear = moment().year();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  return (
    <div className="rbc-toolbar flex flex-col md:flex-row items-center justify-between gap-4 mb-4 !h-auto bg-slate-50/80 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-700/50">
      {/* Navigation Group */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
        <span className="rbc-btn-group">
          <button type="button" onClick={goToToday} className="!px-4 !py-2">Today</button>
          <button type="button" onClick={goToBack} className="!px-3 !py-2">Back</button>
          <button type="button" onClick={goToNext} className="!px-3 !py-2">Next</button>
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={handleMonthYearClick}
            className="font-bold text-sm md:text-base hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-4 py-2 text-foreground ml-2 shadow-sm"
          >
            {moment(date).format('MMMM YYYY')}
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4 z-50 min-w-[300px]">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Month</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                    <SelectTrigger className="w-full [&>svg]:hidden">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Year</Label>
                  <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                    <SelectTrigger className="w-full [&>svg]:hidden">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleDateSelect}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Go
                  </Button>
                  <Button
                    onClick={() => setShowDatePicker(false)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View & Zoom Group */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
        <span className="rbc-btn-group">
          <button type="button" onClick={() => onView('month')} className={view === 'month' ? 'rbc-active' : ''}>
            Month
          </button>
          <button type="button" onClick={() => onView('week')} className={view === 'week' ? 'rbc-active' : ''}>
            Week
          </button>
          <button type="button" onClick={() => onView('day')} className={view === 'day' ? 'rbc-active' : ''}>
            Day
          </button>
        </span>

        {(view === 'week' || view === 'day') && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-1 h-[38px]">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 40}
              title="Zoom Out"
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm dark:shadow-none"
            >
              <ZoomOut size={16} />
            </button>
            <div className="w-12 text-center font-bold text-xs text-muted-foreground select-none">
              {zoomLevel}%
            </div>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 100}
              title="Zoom In"
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm dark:shadow-none"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
