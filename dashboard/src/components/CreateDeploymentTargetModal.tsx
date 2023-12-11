import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { z } from "zod";

import target from "assets/target.svg";

import { useDeploymentTargetList } from "../lib/hooks/useDeploymentTarget";
import { RestrictedNamespaces } from "../main/home/add-on-dashboard/AddOnDashboard";
import api from "../shared/api";
import { Context } from "../shared/Context";
import InputRow from "./form-components/InputRow";
import Button from "./porter/Button";
import Modal from "./porter/Modal";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";

type Props = {
  closeModal: () => void;
  setDeploymentTargetID: (id: string) => void;
};

const CreateDeploymentTargetModal: React.FC<Props> = ({
  closeModal,
  setDeploymentTargetID,
}) => {
  const [creationError, setCreationError] = useState("");
  const [deploymentTargetCreationStatus, setDeploymentTargetCreationStatus] =
    useState<string>("");
  const [isNameHighlight, setIsNameHighlight] = useState(false);
  const [isNameValid, setIsNameValid] = useState(false);
  const [deploymentTargetName, setDeploymentTargetName] = useState("");
  const { deploymentTargetList, isDeploymentTargetListLoading } =
    useDeploymentTargetList({ preview: false });
  const { currentProject, currentCluster } = useContext(Context);

  const isRestrictedName = (name: string): boolean =>
    RestrictedNamespaces.includes(name);

  const hasInvalidCharacters = (name: string): boolean =>
    name !== "" && !/^([a-z0-9]|-)+$/.test(name);

  useEffect(() => {
    validateName(deploymentTargetName);
  }, [deploymentTargetName]);

  const validateName = (name: string): void => {
    setIsNameValid(false);

    if (hasInvalidCharacters(name)) {
      setCreationError("Only lowercase, numbers or dash (-) are allowed");
      setIsNameHighlight(true);
      return;
    }

    setIsNameHighlight(false);

    if (isRestrictedName(name)) {
      setCreationError("Name is a Porter-internal name");
      return;
    }

    if (name.length > 60) {
      setCreationError("Name must be 60 characters or fewer");
      return;
    }

    const deploymentTargetExists = deploymentTargetList.find(
      ({ name: deploymentTarget }) => {
        return deploymentTarget === name;
      }
    );

    if (deploymentTargetExists) {
      setCreationError(
        "Deployment target name already exists, choose another name"
      );
      return;
    }

    setIsNameValid(true);
    setCreationError("");
  };

  const createDeploymentTarget = (): void => {
    if (!currentProject) {
      setCreationError("Could not find current project");
      return;
    }

    if (!currentCluster) {
      setCreationError("Could not find current cluster");
      return;
    }

    setDeploymentTargetCreationStatus("loading");

    api
      .createDeploymentTarget(
        "<token>",
        {
          name: deploymentTargetName,
          preview: false,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        res.data.deployment_target_id &&
          setDeploymentTargetID(res.data.deployment_target_id);
        setDeploymentTargetCreationStatus("successful");
        closeModal();
      })
      .catch((err) => {
        let message = "Could not create";
        if (axios.isAxiosError(err)) {
          const parsed = z
            .object({ error: z.string() })
            .safeParse(err.response?.data);
          if (parsed.success) {
            message = `Deployment target creation failed: ${parsed.data.error}`;
          }
        }
        setDeploymentTargetCreationStatus("error");
        setCreationError(message);
      });
  };

  return (
    <>
      <Modal closeModal={closeModal}>
        <Subtitle>Deployment target name</Subtitle>
        <Spacer y={1} />
        <Text color={isNameHighlight ? "#FFCC00" : "helper"}>
          Lowercase letters, numbers, and &quot;-&quot; only.
        </Text>
        <InputWrapper>
          <DashboardIcon>
            <img src={target} />
          </DashboardIcon>
          <InputRow
            type="string"
            value={deploymentTargetName}
            setValue={(x: string | number) => {
              if (typeof x === "string") {
                setDeploymentTargetName(x);
                setCreationError("");
              }
            }}
            placeholder="ex: porter-workers"
            width="480px"
          />
        </InputWrapper>
        <Spacer y={0.5} />
        <Button
          onClick={createDeploymentTarget}
          disabled={
            isDeploymentTargetListLoading ||
            deploymentTargetName === "" ||
            deploymentTargetCreationStatus === "loading" ||
            !isNameValid
          }
          status={creationError ? "error" : deploymentTargetCreationStatus}
          errorText={creationError}
          width="220px"
        >
          <I className="material-icons">add</I> Create deployment target
        </Button>
      </Modal>
    </>
  );
};

export default CreateDeploymentTargetModal;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 7px;
  justify-content: center;
`;

const DashboardIcon = styled.div`
  border: 1px solid #ffffff55;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 37px;
  width: 35px;
  min-width: 35px;
  margin-right: 10px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 5px;
  > img {
    height: 18px;
    animation: floatIn 0.5s 0s;
    @keyframes floatIn {
      from {
        opacity: 0;
        transform: translateY(7px);
      }
      to {
        opacity: 1;
        transform: translateY(0px);
      }
    }
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Subtitle = styled.div`
  margin-top: 23px;
  font-family: "Work Sans", sans-serif;
  font-size: 15px;
  color: #55555;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: -10px;
`;
