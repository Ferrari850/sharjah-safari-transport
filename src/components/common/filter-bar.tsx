import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type FilterSelect = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel?: string;
};

/**
 * Search + filter controls for a list page.
 *
 * A plain GET form: submitting navigates to the same route with the filters
 * as query parameters, which the Server Component reads. No client
 * JavaScript, and the resulting URL is shareable and bookmarkable.
 */
export function FilterBar({
  action,
  query,
  queryPlaceholder = "Search…",
  selects = [],
  hidden = {},
}: {
  action: string;
  query: string;
  queryPlaceholder?: string;
  selects?: FilterSelect[];
  /** Filters owned by another form on the page, carried through unchanged. */
  hidden?: Record<string, string>;
}) {
  const hasFilters =
    query !== "" ||
    selects.some((s) => s.value !== "") ||
    Object.values(hidden).some((v) => v !== "");

  return (
    <form
      method="get"
      action={action}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="min-w-0 flex-1 sm:min-w-56">
        <label htmlFor="filter-q" className="sr-only">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-q"
            name="q"
            defaultValue={query}
            placeholder={queryPlaceholder}
            className="ps-9"
          />
        </div>
      </div>

      {selects.map((select) => (
        <div key={select.name} className="sm:w-48">
          <label htmlFor={`filter-${select.name}`} className="sr-only">
            {select.label}
          </label>
          <Select
            id={`filter-${select.name}`}
            name={select.name}
            defaultValue={select.value}
          >
            <option value="">{select.allLabel ?? `All ${select.label}`}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {hasFilters && (
          <Button asChild variant="ghost">
            <a href={action}>Clear</a>
          </Button>
        )}
      </div>
    </form>
  );
}
