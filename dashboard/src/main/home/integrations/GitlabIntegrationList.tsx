import React, { useContext, useRef, useState } from "react";
import ConfirmOverlay from "../../../components/ConfirmOverlay";
import styled from "styled-components";
import { Context } from "../../../shared/Context";
import api from "../../../shared/api";
import { integrationList } from "shared/common";
import DynamicLink from "components/DynamicLink";

interface Props {
  gitlabData: any[];
  updateIntegrationList: () => void;
}

type StateType = {
  isDelete: boolean;
  deleteName: string;
  deleteID: number;
};

const GitlabIntegrationList: React.FC<Props> = (props) => {
  const [currentState, setCurrentState] = useState<StateType>({
    isDelete: false,
    deleteName: "",
    deleteID: 0,
  });

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  const handleDeleteIntegration = () => {
    api
      .deleteGitlabIntegration(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          integration_id: currentState.deleteID,
        }
      )
      .then(() => {
        setCurrentState({
          isDelete: false,
          deleteName: "",
          deleteID: 0,
        });
        props.updateIntegrationList();
      })
      .catch((err) => {
        setCurrentError(err);
      });
  };

  return (
    <>
      <ConfirmOverlay
        show={currentState.isDelete}
        message={`Are you sure you want to delete the Gitlab integration for instance ${currentState.deleteName}?`}
        onYes={handleDeleteIntegration}
        onNo={() =>
          setCurrentState({
            isDelete: false,
            deleteName: "",
            deleteID: 0,
          })
        }
      />
      <StyledIntegrationList>
        {props.gitlabData?.length > 0 ? (
          props.gitlabData.map((inst, idx) => {
            return (
              <Integration onClick={() => {}} disabled={false} key={inst.id}>
                <MainRow disabled={false}>
                  <Flex>
                    <Icon src={integrationList.gitlab.icon} />
                    <Label>{inst.instance_url}</Label>
                    {inst.username.includes("Unable") ? (
                      <ErrorLabel>[{inst.username}]</ErrorLabel>
                    ) : (
                      <UsernameLabel>({inst.username})</UsernameLabel>
                    )}
                  </Flex>
                  <MaterialIconTray disabled={false}>
                    <i
                      className="material-icons"
                      onClick={() => {
                        setCurrentState({
                          isDelete: true,
                          deleteName: inst.instance_url,
                          deleteID: inst.id,
                        });
                      }}
                    >
                      delete
                    </i>
                    <i
                      className="material-icons"
                      onClick={() => {
                        window.open(inst.instance_url, "_blank");
                      }}
                    >
                      launch
                    </i>
                  </MaterialIconTray>
                </MainRow>
              </Integration>
            );
          })
        ) : (
          <Placeholder>No GitLab instances found</Placeholder>
        )}
      </StyledIntegrationList>
    </>
  );
};

export default GitlabIntegrationList;

const Placeholder = styled.div`
  width: 100%;
  height: 250px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  justify-content: center;
  margin-top: 30px;
  background: #ffffff11;
  color: #ffffff44;
  border-radius: 5px;
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const UsernameLabel = styled.div`
  color: #ffffff66;
  font-size: 14px;
  font-weight: 500;
  padding: 10px;
`;

const ErrorLabel = styled.div`
  color: #f6685e;
  font-size: 14px;
  font-weight: 500;
  padding: 10px;
`;

const StyledIntegrationList = styled.div`
  margin-top: 20px;
  margin-bottom: 80px;
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  border-radius: 5px;
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
    > i {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: #ffffff44;
    margin-right: -7px;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  background: #26282f;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  margin-bottom: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 15px 0px #00000055;
`;

const Icon = styled.img`
  width: 27px;
  margin-right: 12px;
  margin-bottom: -1px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size: 24px;
    color: #969fbbaa;
    padding: 3px;
    margin-right: 11px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const MaterialIconTray = styled.div`
  max-width: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > i {
    background: #26282f;
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    margin: 0 5px;
    color: #ffffff44;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;
