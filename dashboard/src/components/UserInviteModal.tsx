import React, {useContext, useEffect, useMemo, useState} from "react";
import axios from "axios";
import styled from "styled-components";

import {type Invite, inviteValidator} from "../lib/invites/types";
import InviteRow from "../main/home/app-dashboard/validate-apply/app-settings/EnvGroupRow";
import type { PopulatedEnvGroup } from "../main/home/app-dashboard/validate-apply/app-settings/types";
import Button from "./porter/Button";
import Container from "./porter/Container";
import Modal from "./porter/Modal";
import SelectableList from "./porter/SelectableList";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";
import {Context} from "../shared/Context";
import type {InviteType} from "../shared/types";
import api from "../shared/api";
import type {Column} from "react-table";
import CopyToClipboard from "./CopyToClipboard";
import Loading from "./Loading";
import Heading from "./form-components/Heading";
import Helper from "./form-components/Helper";
import PermissionGroup from "../main/home/project-settings/PermissionGroup";
import RoleModal from "../main/home/project-settings/RoleModal";
import InputRow from "./form-components/InputRow";
import RadioSelector from "./RadioSelector";
import Table from "./OldTable";
import {Collaborator} from "../main/home/project-settings/InviteList";
import {SubmitButton} from "../main/home/cluster-dashboard/stacks/launch/components/styles";
import {AuthnContext} from "../shared/auth/AuthnContext";

type Props = {
  invites: Invite[];
  closeModal: () => void;
};

type InviteMap = Record<
  number,
  {
    status: "pending" | "accepted" | "declined" | "expired";
  }
>;

const UserInviteModal: React.FC<Props> = ({ invites, closeModal }) => {
  const { checkInvites } = useContext(AuthnContext);
  const [inviteMap, setInviteMap] = useState<InviteMap>({});
  const [errorText, setErrorText] = useState<string>("");

  useEffect(() => {
    invites.forEach((invite) => {
      if (!inviteMap[invite.id] && invite.status === "pending") {
        setInviteMap({
          ...inviteMap,
          [invite.id]: {
              status: "pending",
          },
        });
      }
    });
  }, [invites]);

  const acceptInvite = (invite: Invite): void => {
    setInviteMap({
      ...inviteMap,
      [invite.id]: {
          status: "accepted",
      },
    });
  };

  const declineInvite = (invite: Invite): void => {
    setInviteMap({
      ...inviteMap,
      [invite.id]: {
          status: "declined",
      },
    });
  };

  const isDeclined = (invite: Invite): boolean => {
    return inviteMap[invite.id]?.status === "declined";
  };

  const isAccepted = (invite: Invite): boolean => {
    return inviteMap[invite.id]?.status === "accepted";
  };

  return (
    <Modal>
      <Text size={16}>Pending project invites</Text>
      <Spacer height="15px" />
      <>
        <Text color="helper">
          Accept or decline all pending project invites to proceed.
        </Text>
        <Spacer y={1} />
        <ScrollableContainer>
          <InviteList>
            {invites.map((invite, i) => (
              <Container row spaced key={i}>
                <Container>{invite.project.name}</Container>
                <Container>{invite.inviter.email}</Container>
                <SelectedIndicator
                  onClick={() => {
                    declineInvite(invite);
                  }}
                  isSelected={isDeclined(invite)}
                >
                    <Check className="material-icons">close</Check>
                </SelectedIndicator>
                <SelectedIndicator
                  onClick={() => {
                    acceptInvite(invite);
                  }}
                  isSelected={isAccepted(invite)}
                >
                    <Check className="material-icons">check</Check>
                </SelectedIndicator>
              </Container>
            ))}
          </InviteList>
          <Spacer y={1} />
          <Button
            onClick={() => {
                api.respondUserInvites(
                    "<token>",
                    {
                      accepted_invite_ids: Object.entries(inviteMap).filter(([_, invite]) => invite.status === "accepted").map(([id]) => parseInt(id)),
                      declined_invite_ids: Object.entries(inviteMap).filter(([_, invite]) => invite.status === "declined").map(([id]) => parseInt(id)),
                    },
                    {}
                )
                    .then(() => {
                      setErrorText("");
                        console.log("here")
                        checkInvites()
                        console.log("there")
                        closeModal()
                    })
                    .catch((err) => {
                        console.log(err)
                        if (axios.isAxiosError(err) && err.response?.data?.error) {
                            setErrorText(err.response?.data?.error);
                            return;
                        }
                        setErrorText(
                            "An error occurred responding to project invites. Please try again."
                        );
                    })
            }}
            errorText={errorText}
            disabled={Object.values(inviteMap).filter((invite) => invite.status === "pending").length > 0}
            >Respond to invites</Button>
        </ScrollableContainer>
      </>
    </Modal>
  );
};

export default UserInviteModal;

const Check = styled.i`
  color: #ffffff;
  background: #ffffff33;
  width: 24px;
  height: 23px;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
`;

const SelectedIndicator = styled.div<{ isSelected: boolean }>`
  width: 25px;
  height: 25px;
  border: 1px solid ${(props) => (props.isSelected ? "#ffffff" : "#ffffff55")};
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  z-index: 1;
  align-items: center;
  justify-content: center;
  :hover {
    border-color: #ffffff;
    background: #ffffff11;
  }

  > i {
    font-size: 18px;
    color: #ffffff;
  }
`;

const InviteList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ScrollableContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 480px;
`;