import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { deployments, environments } from "../mocks";
import { Environment } from "../types";
import EnvironmentCard from "./EnvironmentCard";

type Props = {
  environments: Environment[];
  setEnvironments: (
    setFunction: (prev: Environment[]) => Environment[]
  ) => void;
};

const EnvironmentsList = ({ environments, setEnvironments }: Props) => {
  const removeEnvironmentFromList = (deletedEnv: Environment) => {
    setEnvironments((prev) => {
      return prev.filter((env) => env.id === deletedEnv.id);
    });
  };

  return (
    <>
      <ControlRow>
        <Button to={`/preview-environments/connect-repo`}>
          <i className="material-icons">add</i> Add Repository
        </Button>
      </ControlRow>
      <EnvironmentsGrid>
        {environments.map((env) => (
          <EnvironmentCard
            key={env.id}
            environment={env}
            onDelete={removeEnvironmentFromList}
          />
        ))}
      </EnvironmentsGrid>
    </>
  );
};

export default EnvironmentsList;

const mockRequest = () =>
  new Promise((res) => {
    setTimeout(() => {
      res({ data: environments });
    }, 1000);
  });

const EnvironmentsGrid = styled.div`
  margin-top: 32px;
  padding-bottom: 150px;
  display: grid;
  grid-row-gap: 25px;
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

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
