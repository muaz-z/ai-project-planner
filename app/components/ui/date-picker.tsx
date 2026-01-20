import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCallback } from "react";

function DatePicker({
  value,
  onValueChange,
  className,
  minDate,
}: {
  value: Date | undefined;
  onValueChange: (date: Date | undefined) => void;
  className?: string;
  minDate?: Date;
}) {
  const [date, setDate] = React.useState<Date | undefined>(value);
  const [open, setOpen] = React.useState(false);

  const onDateSelected = useCallback((date: Date | undefined) => {
    setDate(date);
  }, []);

  const handleClear = useCallback(() => {
    onValueChange(undefined);
    setOpen(false);
  }, [onValueChange]);

  const handleDone = useCallback(() => {
    if (date) {
      onValueChange(date);
    }
    setOpen(false);
  }, [date, onValueChange]);

  React.useEffect(() => {
    setDate(value);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className={cn(
            "data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal",
            className,
          )}
        >
          <CalendarIcon />
          {value ? format(value, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex h-[400px] w-auto flex-col p-0"
        onInteractOutside={(e) => {
          // Prevent closing when clicking month navigation buttons
          const target = e.target as HTMLElement;
          if (target.closest('[role="button"]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex-1 overflow-hidden">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateSelected}
            required={false}
            disabled={minDate ? { before: minDate } : undefined}
          />
        </div>
        <div className="flex gap-2 border-t p-3">
          <Button variant="outline" className="flex-1" onClick={handleClear}>
            Clear
          </Button>
          <Button className="flex-1" onClick={handleDone}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
