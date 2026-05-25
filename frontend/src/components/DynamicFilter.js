import React, { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Filter, X, Check } from 'lucide-react';
import { OptimizedSiteCombobox, OptimizedStaffCombobox, SearchableSelectCombobox } from './SelectionComponents';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '../lib/utils';

/**
 * Generic Dynamic Filter Component
 * 
 * @param {Object} activeFilters - Array of { id, field, operator, value }
 * @param {Function} onChange - Callback for filter changes
 * @param {Object} filterFields - Config for available fields:
 *   { 
 *     fieldKey: { label: 'Field Name', type: 'site|staff|select|text', options: [] } 
 *   }
 * @param {Object} fieldsContext - Data for comboboxes { sites: [], users: [], ... }
 */
export const DynamicFilter = ({
  activeFilters = [],
  onChange,
  filterFields = {},
  fieldsContext = {}
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);

  const addFilter = (fieldKey) => {
    const newFilter = {
      id: Math.random().toString(36).substr(2, 9),
      field: fieldKey,
      operator: 'is',
      value: 'all'
    };
    setEditingFilter(newFilter);
    setAddOpen(false);
  };

  const removeFilter = (id) => {
    onChange(activeFilters.filter(f => f.id !== id));
  };

  const applyActiveFilter = () => {
    if (!editingFilter) return;
    
    const existingIndex = activeFilters.findIndex(f => f.id === editingFilter.id);
    if (existingIndex > -1) {
      const newFilters = [...activeFilters];
      newFilters[existingIndex] = editingFilter;
      onChange(newFilters);
    } else {
      onChange([...activeFilters, editingFilter]);
    }
    setEditingFilter(null);
  };

  const renderValueInput = () => {
    if (!editingFilter) return null;
    const fieldConfig = filterFields[editingFilter.field];
    if (!fieldConfig) return null;
    
    switch (fieldConfig.type) {
      case 'staff':
        return (
          <div className="mt-4">
            <OptimizedStaffCombobox
              users={fieldsContext.users || []}
              value={editingFilter.value}
              onChange={(val) => setEditingFilter({ ...editingFilter, value: val })}
              isLoading={!fieldsContext.users}
            />
          </div>
        );
      case 'site':
        return (
          <div className="mt-4">
            <OptimizedSiteCombobox
              sites={fieldsContext.sites || []}
              value={editingFilter.value}
              onChange={(val) => setEditingFilter({ ...editingFilter, value: val })}
              isLoading={!fieldsContext.sites}
            />
          </div>
        );
      case 'select':
        const allLabel = `All ${editingFilter.field === 'category' ? 'Categories' : 
                       editingFilter.field === 'status' ? 'Statuses' : 
                       editingFilter.field === 'assigned_to_division' ? 'Divisions' :
                       fieldConfig.label === 'Staff' ? 'Staff' :
                       `${fieldConfig.label}s`}`;
        return (
          <div className="mt-4">
            <SearchableSelectCombobox
              options={fieldConfig.options || []}
              value={editingFilter.value}
              onChange={(val) => setEditingFilter({ ...editingFilter, value: val })}
              placeholder={`Select ${fieldConfig.label}`}
              emptyText={`No ${fieldConfig.label.toLowerCase()} found.`}
              allowAll={true}
              allLabel={allLabel}
            />
          </div>
        );
      case 'text':
        return (
          <div className="mt-4">
            <input
              type="text"
              className="w-full h-10 px-3 py-2 bg-transparent border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              placeholder={`Enter ${fieldConfig.label.toLowerCase()}...`}
              value={editingFilter.value === 'all' ? '' : editingFilter.value}
              onChange={(e) => setEditingFilter({ ...editingFilter, value: e.target.value })}
              autoFocus
            />
          </div>
        );
      default:
        return null;
    }
  };

  const getLabelForValue = (filter) => {
    if (!filter.value || filter.value === 'all') return 'any';
    
    const fieldConfig = filterFields[filter.field];
    if (fieldConfig?.type === 'staff') {
      const user = (fieldsContext.users || []).find(u => u.id === filter.value);
      return user ? user.username : filter.value;
    }
    if (fieldConfig?.type === 'site') {
      const site = (fieldsContext.sites || []).find(s => s.id === filter.value);
      return site ? site.name : filter.value;
    }
    return filter.value;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeFilters.map(filter => (
        <Popover key={filter.id} open={editingFilter?.id === filter.id} onOpenChange={(open) => !open && setEditingFilter(null)}>
          <PopoverTrigger asChild>
            <div 
              className="flex items-center bg-muted hover:bg-muted/80 text-foreground border border-border rounded-full px-3 py-1 text-sm shadow-sm cursor-pointer transition-colors"
              onClick={() => setEditingFilter(filter)}
            >
              <span className="font-semibold">{filterFields[filter.field]?.label}</span>
              <span className="mx-1 text-slate-500 font-normal">:</span>
              <span className="font-semibold truncate max-w-[150px]">{getLabelForValue(filter)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFilter(filter.id);
                }}
                className="ml-2 p-0.5 hover:bg-muted-foreground/20 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </PopoverTrigger>
          {editingFilter?.id === filter.id && (
            <PopoverContent className="w-[300px] p-4 bg-popover border border-border shadow-xl rounded-xl z-[100]" align="start">
              <div className="space-y-4">
                 <div className="pt-2">
                    {renderValueInput()}
                 </div>

                 <div className="pt-4 flex justify-between gap-3">
                    <Button variant="ghost" className="flex-1 text-slate-500" onClick={() => setEditingFilter(null)}>Cancel</Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={applyActiveFilter}>Apply Filter</Button>
                 </div>
              </div>
            </PopoverContent>
          )}
        </Popover>
      ))}

      {/* + Add Filter Popover */}
      <Popover open={addOpen || (editingFilter && !activeFilters.find(f => f.id === editingFilter.id))} onOpenChange={(open) => {
        if (!open) {
          setAddOpen(false);
          if (editingFilter && !activeFilters.find(f => f.id === editingFilter.id)) {
            setEditingFilter(null);
          }
        }
      }}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-md w-9 h-9 border border-input bg-background hover:bg-accent text-foreground shadow-sm",
              (addOpen || (editingFilter && !activeFilters.find(f => f.id === editingFilter.id))) && "ring-2 ring-primary/20"
            )}
            onClick={() => setAddOpen(true)}
          >
            <Filter size={20} />
          </Button>
        </PopoverTrigger>
        
        {(addOpen || (editingFilter && !activeFilters.find(f => f.id === editingFilter.id))) && (
          <PopoverContent 
            className={cn(
              "p-0 overflow-hidden bg-popover border border-border shadow-xl rounded-xl flex transition-all duration-200 ease-in-out",
              editingFilter ? "w-[500px]" : "w-[200px]"
            )} 
            align="start"
          >
            {/* Left Side: Field Selection */}
            <div className={cn("w-[200px] bg-muted/50", editingFilter && "border-r border-border")}>
              <Command className="bg-transparent border-none">
                <CommandList className="max-h-[300px] overflow-auto p-1">
                  <CommandGroup>
                    {Object.entries(filterFields).map(([key, config]) => (
                      <CommandItem
                        key={key}
                        onSelect={() => addFilter(key)}
                        className={cn(
                          "px-3 py-2 rounded-md cursor-pointer flex items-center text-sm transition-colors",
                          editingFilter?.field === key ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"
                        )}
                      >
                        {config.label}
                        {editingFilter?.field === key && <Check className="ml-auto w-4 h-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {/* Right Side: Value Input (only if a field is selected) */}
            {editingFilter && (
              <div className="flex-1 p-4 bg-popover animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="space-y-4">
                  <div className="text-sm font-medium text-foreground border-b border-border pb-2">
                    Filter by {filterFields[editingFilter.field]?.label}
                  </div>
                  
                  <div className="min-h-[60px]">
                    {renderValueInput()}
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground hover:text-foreground font-medium" 
                      onClick={() => setEditingFilter(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm px-4" 
                      onClick={applyActiveFilter}
                    >
                      Apply Filter
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </PopoverContent>
        )}
      </Popover>
      
      {activeFilters.length > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onChange([])}
          className="text-muted-foreground hover:text-foreground h-9 ml-1 text-xs font-medium"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
};
