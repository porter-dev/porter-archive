import DynamicLink from "components/DynamicLink";
import RadioFilter from "components/RadioFilter";
import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import DashboardHeader from "../DashboardHeader";
import { NamespaceSelector } from "../NamespaceSelector";
import sort from "assets/sort.svg";
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
        disableLineBreak
      />
      <ControlRow>
        <FilterWrapper>
          <NamespaceSelector
            namespace={currentNamespace}
            setNamespace={handleNamespaceChange}
          />
        </FilterWrapper>
        <Flex>
          <RadioFilter
            selected={currentSort}
            noMargin
            dropdownAlignRight={true}
            setSelected={(sortType: any) => setCurrentSort(sortType as any)}
            options={[
              {
                value: "created_at",
                label: "Created at",
              },
              {
                value: "updated_at",
                label: "Last updated",
              },
              {
                value: "alphabetical",
                label: "Alphabetical",
              },
            ]}
            name="Sort"
            icon={sort}
          />
          <Button to={"/stacks/launch"}>
            <i className="material-icons">add</i>
            Create stack
          </Button>
        </Flex>
      </ControlRow>
      <StackList namespace={currentNamespace} sortBy={currentSort} />
    </>
  );
};

export default Dashboard;

const Flex = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 30px solid transparent;
`;

const Button = styled(DynamicLink)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  color: white;
  margin-left: 10px;
  height: 30px;
  padding: 0 8px;
  padding-right: 13px;
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

const FilterWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 30px solid transparent;
  > div:not(:first-child) {
  }
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;
