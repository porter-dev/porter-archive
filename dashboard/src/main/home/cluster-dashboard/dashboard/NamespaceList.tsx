import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";

export const NamespaceList = () => {
  const context = useContext(Context);
  const [namespaces, setNamespaces] = useState([]);

  useEffect(() => {
    api
      .getNamespaces(
        "<token>",
        { cluster_id: context.currentCluster.id },
        { id: context.currentProject.id }
      )
      .then(({ data }) => {
        setNamespaces(data.items);
      });
  }, [context, setNamespaces]);
  return (
    <NamespaceListWrapper>
      <ControlRow>
        <Button onClick={() => context.setCurrentModal("NamespaceModal")}>
          <i className="material-icons">add</i> Add namespace
        </Button>
      </ControlRow>

      {namespaces.map((namespace) => {
        return <StyledCard> {namespace?.metadata?.name} </StyledCard>;
      })}
    </NamespaceListWrapper>
  );
};

const NamespaceListWrapper = styled.div`
  margin-top: 35px;
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const Button = styled.div`
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

const StyledCard = styled.div`
  background: #26282f;
  min-height: 60px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #26282f;
  box-shadow: 0 5px 8px 0px #00000033;
  border-radius: 5px;
  padding: 14px;
  :not(:last-child) {
    margin-bottom: 25px;
  }
`;
