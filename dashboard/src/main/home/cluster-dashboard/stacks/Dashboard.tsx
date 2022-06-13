import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import DashboardHeader from "../DashboardHeader";
import NamespaceSelector from "../NamespaceSelector";
import StackList from "./_StackList";
const Dashboard = () => {
  const [currentNamespace, setCurrentNamespace] = useState("default");

  const location = useLocation();
  const history = useHistory();
  const { getQueryParam, pushQueryParams } = useRouting();

  const handleNamespaceChange = (namespace: string) => {
    setCurrentNamespace(namespace);
    pushQueryParams({ namespace });
  };

  useEffect(() => {
    const newNamespace = getQueryParam("namespace");
    if (newNamespace !== currentNamespace) {
      setCurrentNamespace(newNamespace);
    }
  }, [location.search, history]);

  return (
    <>
      <DashboardHeader
        materialIconClass="material-icons-outlined"
        image={"lan"}
        title="Preview Environments"
        description=""
      />
      <ActionRow>
        <DynamicLink to={"/stacks/launch"}>Create stack</DynamicLink>
        <NamespaceSelector
          namespace={currentNamespace}
          setNamespace={handleNamespaceChange}
        />
      </ActionRow>
      <StackList namespace={currentNamespace} />
    </>
  );
};

export default Dashboard;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
`;
