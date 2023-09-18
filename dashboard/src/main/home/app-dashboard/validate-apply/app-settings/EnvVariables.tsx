import React, { useCallback, useContext, useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { PorterAppFormData } from "lib/porter-apps";
import EnvGroupArrayV2 from "main/home/cluster-dashboard/env-groups/EnvGroupArrayV2";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArrayV2";
import styled from "styled-components";
import Spacer from "components/porter/Spacer";
import EnvGroupModal from "../../expanded-app/env-vars/EnvGroupModal";
import ExpandableEnvGroup from "../../expanded-app/env-vars/ExpandableEnvGroup";
import { NewPopulatedEnvGroup } from "components/porter-form/types";
import sliders from "assets/sliders.svg";
import Text from "components/porter/Text";
import api from "shared/api";
import { Context } from "shared/Context";


const EnvVariables: React.FC = () => {
  const { control } = useFormContext<PorterAppFormData>();
  const [hovered, setHovered] = useState(false);
  const [syncedEnvGroups, setSyncedEnvGroups] = useState<NewPopulatedEnvGroup[]>([]);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const { currentCluster, currentProject } = useContext(Context);
  const [envGroups, setEnvGroups] = useState<any>([])
  const [deletedEnvGroups, setDeletedEnvGroups] = useState<NewPopulatedEnvGroup[]>([])

  const maxEnvGroupsReached = syncedEnvGroups.length >= 4;
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
      console.log(filteredEnvGroups)
    } catch (error) {
      return;
    }
  }

  const convertSynced = (envGroups: NewPopulatedEnvGroup[]): { name: string; version: bigint }[] => {
    return envGroups?.map(group => ({
      name: group?.name,
      version: BigInt(group?.current_version)
    }));
  }
  const deleteEnvGroup = (envGroup: NewPopulatedEnvGroup) => {

    setDeletedEnvGroups([...deletedEnvGroups, envGroup]);
    setSyncedEnvGroups(syncedEnvGroups?.filter(
      (env) => env.name !== envGroup.name
    ))
  }
  return (
    <Controller
      name={`app.env`}
      control={control}
      render={({ field: { value, onChange } }) => (
        <>
          <EnvGroupArrayV2
            values={value ? value : []}
            setValues={(x: KeyValueType[]) => {
              onChange(x);
            }}
            fileUpload={true}
            syncedEnvGroups={[]} />

          <Controller
            name={`app.envGroups`}
            control={control}
            render={({ field: { value, onChange } }) => (
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
                  setValues={(x: KeyValueType[]) => {
                    onChange(x);
                  }}
                  values={value}
                  closeModal={() => setShowEnvModal(false)}
                  syncedEnvGroups={syncedEnvGroups}
                  setSyncedEnvGroups={
                    (x: NewPopulatedEnvGroup[]) => {
                      setSyncedEnvGroups(x)
                      onChange(convertSynced(x))
                    }
                  }
                  namespace={"default"}
                  newApp={true} />}
                {!!syncedEnvGroups?.length && (
                  <>
                    <Spacer y={0.5} />
                    <Text size={16}>Synced environment groups</Text>
                    {syncedEnvGroups?.map((envGroup: any) => {
                      return (
                        <ExpandableEnvGroup
                          key={envGroup?.name}
                          envGroup={envGroup}
                          onDelete={() => {
                            deleteEnvGroup(envGroup);
                          }} />
                      );
                    })}
                  </>
                )}
              </>)} />

        </>
      )}
    />
  );
};


export default EnvVariables;

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

