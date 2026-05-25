import { useRef, useCallback } from 'react';
import { Bold, Italic, Heading2, List, ListOrdered, Code, FileCode2, Table, Link2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';

const TOOLBAR_ITEMS = [
  {
    icon: Bold,
    label: 'Bold',
    prefix: '**',
    suffix: '**',
    placeholder: 'bold text',
  },
  {
    icon: Italic,
    label: 'Italic',
    prefix: '*',
    suffix: '*',
    placeholder: 'italic text',
  },
  {
    icon: Heading2,
    label: 'Heading',
    prefix: '## ',
    suffix: '',
    placeholder: 'Heading',
    newLine: true,
  },
  { separator: true },
  {
    icon: List,
    label: 'Bullet List',
    prefix: '- ',
    suffix: '',
    placeholder: 'List item',
    newLine: true,
  },
  {
    icon: ListOrdered,
    label: 'Numbered List',
    prefix: '1. ',
    suffix: '',
    placeholder: 'List item',
    newLine: true,
  },
  { separator: true },
  {
    icon: Code,
    label: 'Inline Code',
    prefix: '`',
    suffix: '`',
    placeholder: 'code',
  },
  {
    icon: FileCode2,
    label: 'Code Block',
    prefix: '```\n',
    suffix: '\n```',
    placeholder: 'code here',
    newLine: true,
  },
  { separator: true },
  {
    icon: Table,
    label: 'Table',
    template: '| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |',
    newLine: true,
  },
  {
    icon: Link2,
    label: 'Link',
    prefix: '[',
    suffix: '](url)',
    placeholder: 'link text',
  },
];

const MarkdownToolbar = ({ textareaRef, value, onChange }) => {
  const insertMarkdown = useCallback((item) => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let insertion;
    let cursorOffset;

    if (item.template) {
      // Insert full template
      const needsNewLine = start > 0 && value[start - 1] !== '\n';
      const prefix = needsNewLine ? '\n' : '';
      insertion = prefix + item.template;
      cursorOffset = start + insertion.length;
    } else {
      const { prefix, suffix, placeholder } = item;
      const text = selectedText || placeholder;

      if (item.newLine && start > 0 && value[start - 1] !== '\n') {
        insertion = '\n' + prefix + text + suffix;
      } else {
        insertion = prefix + text + suffix;
      }

      if (selectedText) {
        // Keep selection around the wrapped text
        cursorOffset = start + insertion.length;
      } else {
        // Place cursor inside the wrapper (before suffix)
        const prefixWithNewLine = (item.newLine && start > 0 && value[start - 1] !== '\n') ? '\n' + prefix : prefix;
        cursorOffset = start + prefixWithNewLine.length;
      }
    }

    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus();
      if (item.template || selectedText) {
        textarea.setSelectionRange(cursorOffset, cursorOffset);
      } else {
        const selectStart = cursorOffset;
        const selectEnd = cursorOffset + (item.placeholder?.length || 0);
        textarea.setSelectionRange(selectStart, selectEnd);
      }
    });
  }, [textareaRef, value, onChange]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-secondary/60 border border-border rounded-t-lg border-b-0 flex-wrap">
        {TOOLBAR_ITEMS.map((item, index) => {
          if (item.separator) {
            return (
              <div key={`sep-${index}`} className="w-px h-5 bg-border mx-1" />
            );
          }

          const Icon = item.icon;
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={() => insertMarkdown(item)}
                >
                  <Icon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <span className="ml-auto text-[10px] text-muted-foreground/60 font-medium">Markdown</span>
      </div>
    </TooltipProvider>
  );
};

export default MarkdownToolbar;
