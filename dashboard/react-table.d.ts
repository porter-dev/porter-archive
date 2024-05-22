import {
  type UseColumnOrderInstanceProps,
  type UseColumnOrderState,
  type UseExpandedHooks,
  type UseExpandedInstanceProps,
  type UseExpandedOptions,
  type UseExpandedRowProps,
  type UseExpandedState,
  type UseFiltersColumnOptions,
  type UseFiltersColumnProps,
  type UseFiltersInstanceProps,
  type UseFiltersOptions,
  type UseFiltersState,
  type UseGlobalFiltersColumnOptions,
  type UseGlobalFiltersInstanceProps,
  type UseGlobalFiltersOptions,
  type UseGlobalFiltersState,
  type UseGroupByCellProps,
  type UseGroupByColumnOptions,
  type UseGroupByColumnProps,
  type UseGroupByHooks,
  type UseGroupByInstanceProps,
  type UseGroupByOptions,
  type UseGroupByRowProps,
  type UseGroupByState,
  type UsePaginationInstanceProps,
  type UsePaginationOptions,
  type UsePaginationState,
  type UseResizeColumnsColumnOptions,
  type UseResizeColumnsColumnProps,
  type UseResizeColumnsOptions,
  type UseResizeColumnsState,
  type UseRowSelectHooks,
  type UseRowSelectInstanceProps,
  type UseRowSelectOptions,
  type UseRowSelectRowProps,
  type UseRowSelectState,
  type UseRowStateCellProps,
  type UseRowStateInstanceProps,
  type UseRowStateOptions,
  type UseRowStateRowProps,
  type UseRowStateState,
  type UseSortByColumnOptions,
  type UseSortByColumnProps,
  type UseSortByHooks,
  type UseSortByInstanceProps,
  type UseSortByOptions,
  type UseSortByState,
} from "react-table";

declare module "react-table" {
  // take this file as-is, or comment out the sections that don't apply to your plugin configuration

  export type TableOptions<D extends object = {}> = {} & UseExpandedOptions<D> &
    UseFiltersOptions<D> &
    UseGlobalFiltersOptions<D> &
    UseGroupByOptions<D> &
    UsePaginationOptions<D> &
    UseResizeColumnsOptions<D> &
    UseRowSelectOptions<D> &
    UseRowStateOptions<D> &
    UseSortByOptions<D> &
    Record<string, any>;

  export type Hooks<D extends object = {}> = {} & UseExpandedHooks<D> &
    UseGroupByHooks<D> &
    UseRowSelectHooks<D> &
    UseSortByHooks<D>;

  export type TableInstance<D extends object = {}> =
    {} & UseColumnOrderInstanceProps<D> &
      UseExpandedInstanceProps<D> &
      UseFiltersInstanceProps<D> &
      UseGlobalFiltersInstanceProps<D> &
      UseGroupByInstanceProps<D> &
      UsePaginationInstanceProps<D> &
      UseRowSelectInstanceProps<D> &
      UseRowStateInstanceProps<D> &
      UseSortByInstanceProps<D>;

  export type TableState<D extends object = {}> = {} & UseColumnOrderState<D> &
    UseExpandedState<D> &
    UseFiltersState<D> &
    UseGlobalFiltersState<D> &
    UseGroupByState<D> &
    UsePaginationState<D> &
    UseResizeColumnsState<D> &
    UseRowSelectState<D> &
    UseRowStateState<D> &
    UseSortByState<D>;

  export type ColumnInterface<D extends object = {}> =
    {} & UseFiltersColumnOptions<D> &
      UseGlobalFiltersColumnOptions<D> &
      UseGroupByColumnOptions<D> &
      UseResizeColumnsColumnOptions<D> &
      UseSortByColumnOptions<D>;

  export type ColumnInstance<D extends object = {}> =
    {} & UseFiltersColumnProps<D> &
      UseGroupByColumnProps<D> &
      UseResizeColumnsColumnProps<D> &
      UseSortByColumnProps<D>;

  export type Cell<
    D extends object = {},
    V = any,
  > = {} & UseGroupByCellProps<D> & UseRowStateCellProps<D>;

  export type Row<D extends object = {}> = {} & UseExpandedRowProps<D> &
    UseGroupByRowProps<D> &
    UseRowSelectRowProps<D> &
    UseRowStateRowProps<D>;
}
