import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";

const OptionsDropdown: React.FC = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <OptionsButton
      onClick={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <i className="material-icons-outlined">more_vert</i>
      {isOpen && <DropdownMenu>{children}</DropdownMenu>}
    </OptionsButton>
  );
};

export const NamespaceList: React.FunctionComponent = () => {
  const { currentCluster, currentProject, setCurrentModal } = useContext(
    Context
  );
  const [namespaces, setNamespaces] = useState([]);

  useEffect(() => {
    api
      .getNamespaces(
        "<token>",
        { cluster_id: currentCluster.id },
        { id: currentProject.id }
      )
      .then(({ data }) => {
        setNamespaces(data.items);
      });
  }, [currentCluster?.id, currentProject?.id, setNamespaces]);

  const onDelete = (namespace: any) => {
    setCurrentModal("DeleteNamespaceModal", namespace);
  };

  const isAvailableForDeletion = (namespaceName: string) => {
    // Only the namespaces that doesn't start with kube- or has by name default will be
    // available for deletion (as those are the k8s namespaces)
    return !/(^default$)|(^kube-.*)/.test(namespaceName);
  };

  return (
    <NamespaceListWrapper>
      <ControlRow>
        <Button onClick={() => setCurrentModal("NamespaceModal")}>
          <i className="material-icons">add</i> Add namespace
        </Button>
      </ControlRow>

      {namespaces.map((namespace) => {
        return (
          <StyledCard key={namespace?.metadata?.name}>
            {namespace?.metadata?.name}
            {isAvailableForDeletion(namespace?.metadata?.name) && (
              <OptionsDropdown>
                <DropdownOption onClick={() => onDelete(namespace)}>
                  <i className="material-icons-outlined">delete</i>
                  <span>Delete</span>
                </DropdownOption>
              </OptionsDropdown>
            )}
          </StyledCard>
        );
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

const OptionsButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  :hover {
    background: #32343a;
    cursor: pointer;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  right: 25px;
  top: 10px;
  overflow: hidden;
  width: 120px;
  height: auto;
  background: #26282f;
  box-shadow: 0 8px 20px 0px #00000088;
`;

const DropdownOption = styled.div`
  width: 100%;
  height: 37px;
  font-size: 13px;
  cursor: pointer;
  padding-left: 10px;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  justify-content: center;
  align-items: center;
  :hover {
    background: #ffffff22;
  }
  :not(:first-child) {
    border-top: 1px solid #00000000;
  }

  :not(:last-child) {
    border-bottom: 1px solid #ffffff15;
  }

  > i {
    margin-right: 5px;
    font-size: 16px;
  }
`;
