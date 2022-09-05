import Helper from "components/form-components/Helper";
import Placeholder from "components/Placeholder";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";
import CreateRole from "./pages/CreateRole";
import EditRole from "./pages/EditRole";
import ListRoles from "./pages/ListRoles";
import { RolesAdminProvider } from "./Store";

const AVAILABLE_PAGES = ["index", "create-role", "edit-role"] as const;

type AVAILABLE_PAGES_TYPE = typeof AVAILABLE_PAGES[number];

export type Navigate = (page: AVAILABLE_PAGES_TYPE) => void;

export const RolesAdmin = () => {
  const { currentProject } = useContext(Context);
  const [page, setPage] = useState<AVAILABLE_PAGES_TYPE>("index");

  const navigate: Navigate = (page) => {
    setPage(page);
  };

  if (!currentProject.advanced_rbac_enabled) {
    return (
      <Placeholder height="250px">
        <PlaceHolderContent>
          <h2>Advanced RBAC is not enabled for this project.</h2>
          <Helper>
            Please{" "}
            <a target="_blank" href="mailto:contact@porter.run">
              contact us
            </a>{" "}
            to view plans.
          </Helper>
        </PlaceHolderContent>
      </Placeholder>
    );
  }

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

const PlaceHolderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;
