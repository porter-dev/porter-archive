/**
 * Improved version using as base the usePagination hook by gh user @damiisdandy
 * Base hook on his repo https://github.com/damiisdandy/use-pagination
 */

import { useState } from "react";

interface UsePaginationProps {
  count: number;
  initialPageSize?: number;
}

interface UsePaginationReturn {
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstContentIndex: number;
  lastContentIndex: number;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  canNextPage: boolean;
  canPreviousPage: boolean;
}

type UsePagination = (props: UsePaginationProps) => UsePaginationReturn;

const usePagination: UsePagination = ({ count, initialPageSize }) => {
  const [pageSize, setPageSize] = useState(() => {
    if (typeof initialPageSize === "number" && initialPageSize !== NaN) {
      return initialPageSize;
    }

    return 10;
  });

  const [page, setPage] = useState(1);
  // number of pages in total (total items / content on each page)
  const pageCount = Math.ceil(count / pageSize);
  // index of last item of current page
  const lastContentIndex = page * pageSize;
  // index of first item of current page
  const firstContentIndex = lastContentIndex - pageSize;

  // change page based on direction either front or back
  const changePage = (direction: boolean) => {
    setPage((state) => {
      // move forward
      if (direction) {
        // if page is the last page, do nothing
        if (state === pageCount) {
          return state;
        }
        return state + 1;
        // go back
      } else {
        // if page is the first page, do nothing
        if (state === 1) {
          return state;
        }
        return state - 1;
      }
    });
  };

  const setPageSAFE = (num: number) => {
    // if number is greater than number of pages, set to last page
    if (num > pageCount) {
      setPage(pageCount);
      // if number is less than 1, set page to first page
    } else if (num < 1) {
      setPage(1);
    } else {
      setPage(num);
    }
  };

  const setPageSizeSAFE = (pageSize: number) => {
    if (typeof initialPageSize === "number" && initialPageSize !== NaN) {
      setPageSize(pageSize);
    }
  };

  const canNextPage = page <= pageCount - 1;
  const canPreviousPage = page > 1;

  return {
    totalPages: pageCount,
    nextPage: () => changePage(true),
    prevPage: () => changePage(false),
    setPage: setPageSAFE,
    firstContentIndex,
    lastContentIndex,
    page,
    pageSize,
    setPageSize: setPageSizeSAFE,
    canNextPage,
    canPreviousPage,
  };
};

export default usePagination;
