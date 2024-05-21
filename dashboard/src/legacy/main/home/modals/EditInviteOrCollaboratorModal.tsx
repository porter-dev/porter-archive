import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import SaveButton from "components/SaveButton";
import { Context } from "shared/Context";
import RadioSelector from "components/RadioSelector";
import api from "shared/api";
import { setTimeout } from "timers";

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
  }, []);

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
          kind: selectedRole,
          user_id: user.id,
        },
        { project_id }
      );
      setStatus("successful");
      refetchCallerData().then(() => {
        setTimeout(() => setCurrentModal(null, null), 500);
      });
    } catch (error) {
      setStatus("error");
    }
  };

  const updateInvite = async () => {
    setStatus("loading");
    try {
      await api.updateInvite(
        "<token>",
        { kind: selectedRole },
        { project_id, invite_id: user.id }
      );
      setStatus("successful");
      refetchCallerData().then(() => {
        setTimeout(() => setCurrentModal(null, null), 500);
      });
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <>
      <ModalTitle>
        Update {isInvite ? "invite for" : "collaborator"} {user?.email}
      </ModalTitle>
      <Subtitle>Specify a different role for this user.</Subtitle>
      <RoleSelectorWrapper>
        <RadioSelector
          selected={selectedRole}
          setSelected={setSelectedRole}
          options={roleList}
        />
      </RoleSelectorWrapper>

      <SaveButton
        text={`Update ${isInvite ? "invite" : "collaborator"}`}
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
