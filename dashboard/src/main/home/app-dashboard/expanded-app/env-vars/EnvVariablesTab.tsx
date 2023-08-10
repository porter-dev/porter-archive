import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import EnvGroupArrayStacks from "main/home/cluster-dashboard/env-groups/EnvGroupArrayStacks";
import React, { useContext, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import Text from "components/porter/Text";
import Error from "components/porter/Error";
import sliders from "assets/sliders.svg";
import EnvGroupModal from "./EnvGroupModal";
import ExpandableEnvGroup from "./ExpandableEnvGroup";
import { PopulatedEnvGroup, PartialEnvGroup, NewPopulatedEnvGroup } from "../../../../../components/porter-form/types";
import _, { isObject, differenceBy, omit } from "lodash";
import api from "../../../../../shared/api";
import { Context } from "../../../../../shared/Context";
import yaml from "js-yaml";

interface EnvVariablesTabProps {
  envVars: any;
  setEnvVars: (x: any) => void;
  status: React.ReactNode;
  updatePorterApp: any;
  syncedEnvGroups: NewPopulatedEnvGroup[];
  setSyncedEnvGroups: (values: NewPopulatedEnvGroup[]) => void;
  clearStatus: () => void;
  appData: any;
  deletedEnvGroups: NewPopulatedEnvGroup[];
  setDeletedEnvGroups: (values: NewPopulatedEnvGroup[]) => void;
}

export const EnvVariablesTab: React.FC<EnvVariablesTabProps> = ({
  envVars,
  setEnvVars,
  status,
  updatePorterApp,
  syncedEnvGroups,
  setSyncedEnvGroups,
  deletedEnvGroups,
  setDeletedEnvGroups,
  clearStatus,
  appData,
}) => {
  const [hovered, setHovered] = useState(false);

  const [showEnvModal, setShowEnvModal] = useState(false);
  const [envGroups, setEnvGroups] = useState<any>([])
  const { currentCluster, currentProject } = useContext(Context);

  const [values, setValues] = React.useState<string>(yaml.dump(appData.chart.config));
  useEffect(() => {
    setEnvVars(envVars);
  }, [envVars]);
  useEffect(() => {
    updateEnvGroups();
  }, []);

  const updateEnvGroups = async () => {
    let populateEnvGroupsPromises: NewPopulatedEnvGroup[] = [];
    try {
      populateEnvGroupsPromises = await api
        .getAllEnvGroups<NewPopulatedEnvGroup[]>(
          "<token>",
          {},
          {
            id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        )
        .then((res) => res?.data?.environment_groups);
    } catch (error) {
      return;
    }

    try {
      const populatedEnvGroups = await Promise.all(populateEnvGroupsPromises);
      setEnvGroups(populatedEnvGroups)
      const filteredEnvGroups = populatedEnvGroups?.filter(envGroup =>
        envGroup.linked_applications && envGroup.linked_applications.includes(appData.chart.name)
      );
      setSyncedEnvGroups(filteredEnvGroups)

    } catch (error) {
      return;
    }
  }

  const deleteEnvGroup = (envGroup: NewPopulatedEnvGroup) => {

    setDeletedEnvGroups([...deletedEnvGroups, envGroup]);
    setSyncedEnvGroups(syncedEnvGroups?.filter(
      (env) => env.name !== envGroup.name
    ))
  }
  const maxEnvGroupsReached = syncedEnvGroups.length >= 4;

  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      <Text color="helper">Shared among all services.</Text>
      <EnvGroupArrayStacks
        key={envVars.length}
        values={envVars}
        setValues={(x: any) => {
          if (status !== "") {
            clearStatus();
          }
          setEnvVars(x)
        }}
        fileUpload={true}
        syncedEnvGroups={syncedEnvGroups}
      />

      <>
        <TooltipWrapper
          onMouseOver={() => setHovered(true)}
          onMouseOut={() => setHovered(false)}>
          <LoadButton
            disabled={maxEnvGroupsReached}
            onClick={() => !maxEnvGroupsReached && setShowEnvModal(true)}
          >
            <img src={sliders} /> Load from Env Group
          </LoadButton>
          <TooltipText visible={maxEnvGroupsReached && hovered}>Max 4 Env Groups allowed</TooltipText>
        </TooltipWrapper>

        {showEnvModal && <EnvGroupModal
          setValues={(x: any) => {
            if (status !== "") {
              clearStatus();
            }
            setEnvVars(x);
          }}
          values={envVars}
          closeModal={() => setShowEnvModal(false)}
          syncedEnvGroups={syncedEnvGroups}
          setSyncedEnvGroups={setSyncedEnvGroups}
          namespace={appData.chart.namespace}
        />}
        {!!syncedEnvGroups?.length && (
          <>
            <Spacer y={0.5} />
            <Text size={16}>Synced environment groups</Text >
            {syncedEnvGroups?.map((envGroup: any) => {
              return (
                <ExpandableEnvGroup
                  key={envGroup?.name}
                  envGroup={envGroup}
                  onDelete={() => {
                    deleteEnvGroup(envGroup);
                  }}
                />
              );
            })}
          </>
        )}
      </>


      <Spacer y={0.5} />
      <Button
        onClick={() => {
          updatePorterApp()
        }}
        status={status}
        loadingText={"Updating..."}
      >
        Update app
      </Button>
      <Spacer y={0.5} />
    </>
  );
};


const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 32px;
  border-radius: 3px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const LoadButton = styled(AddRowButton) <{ disabled?: boolean }>`
  background: ${(props) => (props.disabled ? "#aaaaaa55" : "none")};
  border: 1px solid ${(props) => (props.disabled ? "#aaaaaa55" : "#ffffff55")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};

  > i {
    color: ${(props) => (props.disabled ? "#aaaaaa44" : "#ffffff44")};
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
    opacity: ${(props) => (props.disabled ? "0.5" : "1")};
  }
`;


type InputProps = {
  disabled?: boolean;
  width: string;
  borderColor?: string;
};

const KeyInput = styled.input<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
  border-radius: 3px;
  width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 5px 10px;
  height: 35px;
`;

export const MultiLineInput = styled.textarea<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
  border-radius: 3px;
  min-width: ${(props) => (props.width ? props.width : "270px")};
  max-width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 8px 10px 5px 10px;
  min-height: 35px;
  max-height: 100px;
  white-space: nowrap;

  ::-webkit-scrollbar {
    width: 8px;
    :horizontal {
      height: 8px;
    }
  }

  ::-webkit-scrollbar-corner {
    width: 10px;
    background: #ffffff11;
    color: white;
  }

  ::-webkit-scrollbar-track {
    width: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipText = styled.span`
  visibility: ${(props) => (props.visible ? 'visible' : 'hidden')};
  width: 240px;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
  bottom: 100%;
  left: 50%;
  margin-left: -120px;
  opacity: ${(props) => (props.visible ? '1' : '0')};
  transition: opacity 0.3s;
  font-size: 12px;
`;

