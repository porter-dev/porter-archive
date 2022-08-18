import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import CreateRole from "./pages/CreateRole";
import EditRole from "./pages/EditRole";
import ListRoles from "./pages/ListRoles";
import { RolesAdminProvider } from "./Store";

const AVAILABLE_PAGES = ["index", "create-role", "edit-role"] as const;

type AVAILABLE_PAGES_TYPE = typeof AVAILABLE_PAGES[number];

export type Navigate = (page: AVAILABLE_PAGES_TYPE) => void;

export const RolesAdmin = () => {
  const [page, setPage] = useState<AVAILABLE_PAGES_TYPE>("index");

  const navigate: Navigate = (page) => {
    setPage(page);
  };

  return (
    <>
      <RolesAdminProvider>
        {page === "index" ? <ListRoles navigate={navigate} /> : null}
        {page === "create-role" ? <CreateRole navigate={navigate} /> : null}
        {page === "edit-role" && <EditRole navigate={navigate} />}
      </RolesAdminProvider>
    </>
  );
};
