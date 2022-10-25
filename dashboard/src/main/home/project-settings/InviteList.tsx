import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { InviteType } from "shared/types";
import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "components/Loading";
import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import Heading from "components/form-components/Heading";
import CopyToClipboard from "components/CopyToClipboard";
import { Column } from "react-table";
import Table from "components/Table";
import RadioSelector from "components/RadioSelector";

type Props = {};

export type Collaborator = {
  id: string;
  user_id: string;
  project_id: string;
  email: string;
  kind: string;
};

const InvitePage: React.FunctionComponent<Props> = ({}) => {
  const {
    currentProject,
    setCurrentModal,
    setCurrentError,
    user,
    usage,
    hasBillingEnabled,
    edition,
  } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [invites, setInvites] = useState<Array<InviteType>>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const [roleList, setRoleList] = useState([]);
  const [isInvalidEmail, setIsInvalidEmail] = useState(false);
  const [isHTTPS] = useState(() => window.location.protocol === "https:");

  useEffect(() => {
    api
      .getAvailableRoles("<token>", {}, { project_id: currentProject?.id })
      .then(({ data }: { data: string[] }) => {
        const availableRoleList = data?.map((role) => ({
          value: role,
          label: capitalizeFirstLetter(role),
        }));
        setRoleList(availableRoleList);
        setRole("developer");
      });

    getData();
  }, [currentProject]);

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const getData = async () => {
    setIsLoading(true);
    let invites = [];
    try {
      const response = await api.getInvites(
        "<token>",
        {},
        {
          id: currentProject?.id,
        }
      );
      invites = response.data.filter(
        (i: InviteType) => !i.accepted && i.email !== "support@porter.run"
      );
    } catch (err) {
      console.log(err);
    }
    let collaborators: any = [];
    try {
      const response = await api.getCollaborators(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
        }
      );
      collaborators = parseCollaboratorsResponse(response.data);
    } catch (err) {
      console.log(err);
    }
    setInvites([...invites, ...collaborators]);
    setIsLoading(false);
  };

  const parseCollaboratorsResponse = (
    collaborators: Array<Collaborator>
  ): Array<InviteType> => {
    const admins = collaborators
      .filter((c) => c.kind === "admin" && c.email !== "support@porter.run")
      .map((c) => ({ ...c, id: Number(c.id) }))
      .sort((curr, prev) => curr.id - prev.id)
      .slice(1);

    const nonAdmins = collaborators
      .filter((c) => c.kind !== "admin" && c.email !== "support@porter.run")
      .map((c) => ({ ...c, id: Number(c.id) }))
      .sort((curr, prev) => curr.id - prev.id);

    return [...admins, ...nonAdmins].map((c) => ({
      email: c.email,
      expired: false,
      id: Number(c.user_id),
      kind: c.kind,
      accepted: true,
      token: "",
    }));
  };

  const createInvite = () => {
    api
      .createInvite(
        "<token>",
        { email: email.toLowerCase(), kind: role },
        { id: currentProject.id }
      )
      .then(() => {
        getData();
        setEmail("");
      })
      .catch((err) => {
        if (err.response.data?.error) {
          setCurrentError(err.response.data?.error);
        }

        console.log(err);
      });
  };

  const deleteInvite = (inviteId: number) => {
    api
      .deleteInvite(
        "<token>",
        {},
        {
          id: currentProject.id,
          invId: inviteId,
        }
      )
      .then(getData)
      .catch((err) => console.log(err));
  };

  const replaceInvite = (
    inviteEmail: string,
    inviteId: number,
    kind: string
  ) => {
    api
      .createInvite(
        "<token>",
        { email: inviteEmail, kind },
        { id: currentProject.id }
      )
      .then(() =>
        api.deleteInvite(
          "<token>",
          {},
          {
            id: currentProject.id,
            invId: inviteId,
          }
        )
      )
      .then(getData)
      .catch((err) => {
        if (err.response.data?.error) {
          setCurrentError(err.response.data?.error);
        }

        console.log(err);
      });
  };

  const validateEmail = () => {
    const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!regex.test(email.toLowerCase())) {
      setIsInvalidEmail(true);
      return;
    }

    setIsInvalidEmail(false);
    createInvite();
  };

  const openEditModal = (user: any) => {
    if (setCurrentModal) {
      setCurrentModal("EditInviteOrCollaboratorModal", {
        user,
        isInvite: user.status !== "accepted",
        refetchCallerData: getData,
      });
    }
  };

  const removeCollaborator = (user_id: number) => {
    try {
      api.removeCollaborator(
        "<token>",
        { user_id },
        { project_id: currentProject.id }
      );
      getData();
    } catch (error) {
      console.log(error);
    }
  };

  const columns = useMemo<
    Column<{
      email: string;
      id: number;
      status: string;
      invite_link: string;
      kind: string;
    }>[]
  >(
    () => [
      {
        Header: "User",
        accessor: "email",
      },
      {
        Header: "Role",
        accessor: "kind",
        Cell: ({ row }) => {
          return <Role>{row.values.kind || "Developer"}</Role>;
        },
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }) => {
          return (
            <Status status={row.values.status}>{row.values.status}</Status>
          );
        },
      },
      {
        Header: "",
        accessor: "invite_link",
        Cell: ({ row }) => {
          if (row.values.status === "expired") {
            return (
              <NewLinkButton
                onClick={() =>
                  replaceInvite(
                    row.values.email,
                    row.original.id,
                    row.values.kind
                  )
                }
              >
                <u>Generate a new link</u>
              </NewLinkButton>
            );
          }
          if (row.values.status === "accepted") {
            return "";
          }

          return (
            <>
              <CopyToClipboard as={Url} text={row.values.invite_link}>
                <span>{row.values.invite_link}</span>
                <i className="material-icons-outlined">content_copy</i>
              </CopyToClipboard>
            </>
          );
        },
      },
      {
        id: "edit_action",
        Cell: ({ row }: any) => {
          return <></>;
        },
      },
      {
        id: "remove_invite_action",
        Cell: ({ row }: any) => {
          if (row.values.status === "accepted") {
            return (
              <Flex>
                <SettingsButton
                  invis={row.original.currentUser}
                  onClick={() => openEditModal(row.original)}
                >
                  <i className="material-icons">more_vert</i>
                </SettingsButton>
                <DeleteButton
                  invis={row.original.currentUser}
                  onClick={() => removeCollaborator(row.original.id)}
                >
                  <i className="material-icons">delete</i>
                </DeleteButton>
              </Flex>
            );
          }
          return (
            <Flex>
              <SettingsButton
                invis={row.original.currentUser}
                onClick={() => openEditModal(row.original)}
              >
                <i className="material-icons">more_vert</i>
              </SettingsButton>
              <DeleteButton
                invis={row.original.currentUser}
                onClick={() => deleteInvite(row.original.id)}
              >
                <i className="material-icons">delete</i>
              </DeleteButton>
            </Flex>
          );
        },
      },
    ],
    []
  );

  const data = useMemo(() => {
    const inviteList = [...invites];
    inviteList.sort((a: any, b: any) => (a.email > b.email ? 1 : -1));
    inviteList.sort((a: any, b: any) => (a.accepted > b.accepted ? 1 : -1));
    const buildInviteLink = (token: string) => `
      ${isHTTPS ? "https://" : ""}${window.location.host}/api/projects/${
      currentProject.id
    }/invites/${token}
    `;

    if (!user) {
      return [];
    }

    const mappedInviteList = inviteList.map(
      ({ accepted, expired, token, ...rest }) => {
        const currentUser: boolean = user.email === rest.email;
        if (accepted) {
          return {
            status: "accepted",
            invite_link: buildInviteLink(token),
            currentUser,
            ...rest,
          };
        }

        if (!accepted && expired) {
          return {
            status: "expired",
            invite_link: buildInviteLink(token),
            currentUser,
            ...rest,
          };
        }

        return {
          status: "pending",
          invite_link: buildInviteLink(token),
          currentUser,
          ...rest,
        };
      }
    );

    return mappedInviteList || [];
  }, [invites, currentProject?.id, window?.location?.host, isHTTPS, user?.id]);

  const hasSeats = useMemo(() => {
    if (String(edition) === "dev-ee") {
      return true;
    }

    if (!hasBillingEnabled) {
      return true;
    }

    if (usage?.limit.users === 0) {
      // If usage limit is 0, the project has unlimited seats. Otherwise, check
      // the usage limit against the current usage.
      return true;
    }
    return usage?.current.users < usage?.limit.users;
  }, [hasBillingEnabled, usage, edition]);

  if (hasBillingEnabled === null && usage === null) {
    <Loading height={"30%"} />;
  }

  return (
    <>
      <>
        <Heading isAtTop={true}>Share project</Heading>
        <Helper>Generate a project invite for another user.</Helper>
        <InputRowWrapper>
          <InputRow
            value={email}
            type="text"
            setValue={(newEmail: string) => setEmail(newEmail)}
            width="100%"
            placeholder="ex: mrp@porter.run"
          />
        </InputRowWrapper>
        <Helper>Specify a role for this user.</Helper>
        <RoleSelectorWrapper>
          <RadioSelector
            selected={role}
            setSelected={setRole}
            options={roleList}
          />
        </RoleSelectorWrapper>
        <ButtonWrapper>
          <InviteButton disabled={!hasSeats} onClick={() => validateEmail()}>
            Create invite
          </InviteButton>
          {isInvalidEmail && (
            <Invalid>Invalid email address. Please try again.</Invalid>
          )}
          {!hasSeats && (
            <Invalid>
              You need to upgrade your plan to invite more users to the project
            </Invalid>
          )}
        </ButtonWrapper>
      </>

      <Heading>Invites & collaborators</Heading>
      <Helper>Manage pending invites and view collaborators.</Helper>
      {isLoading && <Loading height={"30%"} />}
      {data?.length && !isLoading ? (
        <Table
          columns={columns}
          data={data}
          disableHover={true}
          isLoading={false}
          disableGlobalFilter={true}
        />
      ) : (
        !isLoading && (
          <Placeholder>
            This project currently has no invites or collaborators.
          </Placeholder>
        )
      )}
    </>
  );
};

export default InvitePage;

const Flex = styled.div`
  display: flex;
  align-items: center;
  width: 70px;
  float: right;
  justify-content: space-between;
`;

const DeleteButton = styled.div`
  display: flex;
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  align-items: center;
  justify-content: center;
  width: 30px;
  float: right;
  height: 30px;
  :hover {
    background: #ffffff11;
    border-radius: 20px;
    cursor: pointer;
  }

  > i {
    font-size: 20px;
    color: #ffffff44;
    border-radius: 20px;
  }
`;

const SettingsButton = styled(DeleteButton)`
  margin-right: -60px;
`;

const Role = styled.div`
  text-transform: capitalize;
  margin-right: 50px;
`;

const RoleSelectorWrapper = styled.div`
  font-size: 14px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  margin-top: 23px;
  justify-content: center;
  background: #ffffff11;
  border-radius: 5px;
  color: #ffffff44;
  font-size: 13px;
`;

const ButtonWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const InputRowWrapper = styled.div`
  width: 40%;
`;

const CopyButton = styled.div`
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
  margin: 8px 0 8px 12px;
  float: right;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120px;
  cursor: pointer;
  height: 30px;
  border-radius: 5px;
  border: 1px solid #ffffff20;
  background-color: #ffffff10;
  overflow: hidden;
  transition: all 0.1s ease-out;
  :hover {
    border: 1px solid #ffffff66;
    background-color: #ffffff20;
  }
`;

const NewLinkButton = styled(CopyButton)`
  border: none;
  width: auto;
  float: none;
  display: block;
  margin: unset;
  background-color: transparent;
  :hover {
    border: none;
    background-color: transparent;
  }
`;

const InviteButton = styled.div<{ disabled: boolean }>`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 15px;
  margin-top: 13px;
  text-align: left;
  float: left;
  margin-left: 0;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? "#616FEEcc" : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
  margin-bottom: 10px;
`;

const Url = styled.a`
  max-width: 300px;
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :hover {
    cursor: pointer;
  }
`;

const Invalid = styled.div`
  color: #f5cb42;
  margin-left: 15px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const Status = styled.div<{ status: "accepted" | "expired" | "pending" }>`
  padding: 5px 10px;
  margin-right: 12px;
  background: ${(props) => {
    if (props.status === "accepted") return "#38a88a";
    if (props.status === "expired") return "#cc3d42";
    if (props.status === "pending") return "#ffffff11";
  }};
  font-size: 13px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 25px;
  max-width: 80px;
  text-transform: capitalize;
  font-weight: 400;
  user-select: none;
`;
