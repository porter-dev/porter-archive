import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import SaveButton from "components/SaveButton";
import { Context } from "shared/Context";
import RadioSelector from "components/RadioSelector";
import api from "shared/api";
// import { setTimeout } from "timers";

const EditCollaboratorModal = () => {
  const {
    setCurrentModal,
    currentModalData: { user, isInvite, refetchCallerData },
    currentProject: { id: project_id },
  } = useContext(Context);
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
        { kind: selectedRole },
        { project_id, user_id: user.id }
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
    <StyledUpdateProjectModal>
      <CloseButton
        onClick={() => {
          setCurrentModal(null, null);
        }}
      >
        <CloseButtonImg src={close} />
      </CloseButton>

      <ModalTitle>
        Update {isInvite ? "Invite for" : "Collaborator"} {user?.email}
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
        text={`Update ${isInvite ? "Invite" : "Collaborator"}`}
        color="#616FEEcc"
        onClick={() => handleUpdate()}
        status={status}
      />
    </StyledUpdateProjectModal>
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
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: "Assistant";
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledUpdateProjectModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;
