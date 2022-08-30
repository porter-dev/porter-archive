import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import SaveButton from "components/SaveButton";
import { Context } from "shared/Context";
import api from "shared/api";
import { setTimeout } from "timers";
import { RoleList } from "../project-settings/roles-admin/types";
import { RoleSelector } from "../project-settings/InviteList";
import { AxiosError } from "axios";

const EditCollaboratorModal = () => {
  const {
    setCurrentModal,
    currentModalData,
    currentProject: { id: project_id },
  } = useContext(Context);

  const { user, isInvite, refetchCallerData } = {
    user: currentModalData?.user,
    isInvite: currentModalData?.isInvite,
    refetchCallerData: currentModalData?.refetchCallerData,
  };

  const [status, setStatus] = useState<undefined | string>();
  const [selectedRole, setSelectedRole] = useState("");
  const [roleList, setRoleList] = useState([]);

  const [roles, setRoles] = useState<RoleList>([]);
  const [selectedRoles, setSelectedRoles] = useState<RoleList>([]);

  useEffect(() => {
    api
      .getAvailableRoles("<token>", {}, { project_id })
      .then(({ data }: { data: string[] }) => {
        const availableRoleList = data?.map((role) => ({
          value: role,
          label: capitalizeFirstLetter(role),
        }));
        setRoleList(availableRoleList);
        setSelectedRole(user?.kind || "developer");
      });

    api.listRoles<RoleList>("<token>", {}, { project_id }).then((res) => {
      const newRoles = res.data;
      setRoles(newRoles);

      const selectedRoles = newRoles.filter((role) =>
        user.roles.includes(role.id)
      );
      setSelectedRoles(selectedRoles);
    });
  }, [project_id]);

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleUpdate = () => {
    if (isInvite) {
      updateInvite();
    } else {
      updateCollaborator();
    }
  };

  const updateCollaborator = async () => {
    setStatus("loading");
    try {
      await api.updateCollaborator(
        "<token>",
        {
          roles: selectedRoles.map((role) => role.id),
        },
        { project_id, user_id: user.id }
      );
      setStatus("successful");
      refetchCallerData().then(() => {
        setTimeout(() => setCurrentModal(null, null), 500);
      });
    } catch (error) {
      const axiosError: AxiosError = error;

      if (axiosError?.response?.status === 400) {
        setStatus("You must select at least one role");
        return;
      }
      setStatus("error");
    }
  };

  const updateInvite = async () => {
    setStatus("loading");
    try {
      await api.updateInvite(
        "<token>",
        { kind: selectedRole, roles: selectedRoles.map((role) => role.id) },
        { project_id, invite_id: user.id }
      );
      setStatus("successful");
      refetchCallerData().then(() => {
        setTimeout(() => setCurrentModal(null, null), 500);
      });
    } catch (error) {
      const axiosError: AxiosError = error;

      if (axiosError?.response?.status === 400) {
        setStatus("You must select at least one role");
        return;
      }

      setStatus("error");
    }
  };

  return (
    <>
      <ModalTitle>
        Update {isInvite ? "Invite for" : "Collaborator"} {user?.email}
      </ModalTitle>
      <Subtitle>Specify a different role for this user.</Subtitle>
      <RoleSelectorWrapper>
        {/* <RadioSelector
          selected={selectedRole}
          setSelected={setSelectedRole}
          options={roleList}
        /> */}
        <RoleSelector
          onChange={(e) => setSelectedRoles(e)}
          options={roles}
          values={selectedRoles}
        />
      </RoleSelectorWrapper>

      <SaveButton
        text={`Update ${isInvite ? "Invite" : "Collaborator"}`}
        color="#616FEEcc"
        onClick={() => handleUpdate()}
        status={status}
      />
    </>
  );
};

export default EditCollaboratorModal;

const RoleSelectorWrapper = styled.div`
  font-size: 14px;
  margin-top: 25px;
`;

const Subtitle = styled.div`
  margin-top: 23px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: -10px;
`;

const ModalTitle = styled.div`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
  user-select: none;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;
