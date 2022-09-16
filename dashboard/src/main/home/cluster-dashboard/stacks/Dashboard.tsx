import DynamicLink from "components/DynamicLink";
import Selector from "components/Selector";
import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import DashboardHeader from "../DashboardHeader";
import { NamespaceSelector } from "../NamespaceSelector";
import SortSelector from "../SortSelector";
import { Action } from "./components/styles";
import StackList from "./_StackList";
const Dashboard = () => {
  const [currentNamespace, setCurrentNamespace] = useState("default");
  const [currentSort, setCurrentSort] = useState<
    "created_at" | "updated_at" | "alphabetical"
  >("created_at");

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
      <Action.Row>
        <Action.Button to={"/stacks/launch"}>
          <i className="material-icons">add</i>
          Create Stack
        </Action.Button>
        <FilterWrapper>
          <StyledSortSelector>
            <Label>
              <i className="material-icons">sort</i> Sort
            </Label>
            <Selector
              activeValue={currentSort}
              setActiveValue={(sortType) => setCurrentSort(sortType as any)}
              options={[
                {
                  value: "created_at",
                  label: "Created At",
                },
                {
                  value: "updated_at",
                  label: "Last Updated",
                },
                {
                  value: "alphabetical",
                  label: "Alphabetical",
                },
              ]}
              dropdownLabel="Sort By"
              width="150px"
              dropdownWidth="230px"
              closeOverlay={true}
            />
          </StyledSortSelector>
          <NamespaceSelector
            namespace={currentNamespace}
            setNamespace={handleNamespaceChange}
          />
        </FilterWrapper>
      </Action.Row>
      <StackList namespace={currentNamespace} sortBy={currentSort} />
    </>
  );
};

export default Dashboard;

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledSortSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  margin-right: 30px;
`;

const FilterWrapper = styled.div`
  display: flex;
`;
