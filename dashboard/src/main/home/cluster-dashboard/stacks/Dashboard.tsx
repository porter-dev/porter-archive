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
        title="Stacks"
        description="Groups of applications deployed from a shared source."
      />
      <ActionRow>
        <Button to={"/stacks/launch"}>
          <i className="material-icons">add</i>
          Create Stack
        </Button>
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

const Button = styled(DynamicLink)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  min-width: 130px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
`;
