import DocsHelper from "components/DocsHelper";
import CheckboxRow from "components/form-components/CheckboxRow";
import Loading from "components/Loading";
import Modal from "main/home/modals/Modal";
import React, { useContext, useReducer, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled, { css, keyframes } from "styled-components";
import { Environment } from "../types";

const EnvironmentSettings = ({ environmentId }: { environmentId: string }) => {
  const { currentCluster, currentProject } = useContext(Context);

  const [show, toggle] = useReducer((prev) => !prev, false);

  const [environment, setEnvironment] = useState<Environment>();

  const [isNewCommentsDisabled, setIsNewCommentsDisabled] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const getEnvironment = async () => {
    return api.getEnvironment(
      "<token>",
      {},
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
        environment_id: Number(environmentId),
      }
    );
  };
  const handleToggleCommentStatus = async (currentlyDisabled: boolean) => {
    try {
      await api.toggleNewCommentForEnvironment(
        "<token>",
        {
          disable: !currentlyDisabled,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: Number(environmentId),
        }
      );

      setIsNewCommentsDisabled(!currentlyDisabled);
    } catch (error) {}
  };

  const handleOpen = async () => {
    setIsLoading(true);
    const response = await getEnvironment();
    setEnvironment(response.data);
    setIsLoading(false);
    toggle();
  };

  return (
    <>
      <SettingsButton type="button" onClick={handleOpen} isLoading={isLoading}>
        <i className="material-icons">settings</i>
      </SettingsButton>
      {show && (
        <Modal
          height="300px"
          onRequestClose={toggle}
          title={`${environment.name}`}
        >
          <>
            {/* Add checkbox to change deployment mode (auto | manaul) */}
            {/* Add branch selector (probably will have to create a new component that lets the user pick multiple) */}
            {/* Add Flex to keep this inline */}
            <CheckboxRow
              label="Disable new comments for deployments"
              checked={isNewCommentsDisabled}
              toggle={() => handleToggleCommentStatus(isNewCommentsDisabled)}
            />
            <DocsHelper
              disableMargin
              tooltipText="When checked, comments for every new deployment are disabled. Instead, the most recent comment is updated each time."
              placement="top-end"
            />
            {/* <Flex>
        <ActionsWrapper>
          <FlexWrap>
            <Div></Div>
          </FlexWrap>
        </ActionsWrapper>
      </Flex> */}
          </>
        </Modal>
      )}
    </>
  );
};

export default EnvironmentSettings;

const rotatingAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const iconAnimation = css`
  animation: ${rotatingAnimation} 1s linear infinite;
`;

const SettingsButton = styled.button<{ isLoading: boolean }>`
  background: none;
  color: white;
  border: none;
  margin-left: 10px;
  cursor: pointer;
  > i {
    font-size: 20px;
    ${({ isLoading }) => (isLoading ? iconAnimation : "")}
  }
`;

const mockPromise = (): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({});
    }, 1000);
  });
};
