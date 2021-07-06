import React, {
  Component,
  useState,
  useEffect,
  useContext,
  useMemo,
} from "react";
import styled from "styled-components";

import { InviteType } from "shared/types";
import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "components/Loading";
import InputRow from "components/values-form/InputRow";
import Helper from "components/values-form/Helper";
import Heading from "components/values-form/Heading";
import CopyToClipboard from "components/CopyToClipboard";
import { Column } from "react-table";
import Table from "components/Table";

type Props = {};

const InvitePage: React.FunctionComponent<Props> = ({}) => {
  const { currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [invites, setInvites] = useState<Array<InviteType>>([]);
  const [email, setEmail] = useState("");
  const [isInvalidEmail, setIsInvalidEmail] = useState(false);
  const [isHTTPS] = useState(() => window.location.protocol === "https:");

  useEffect(() => {
    getInviteData();
  }, []);

  const getInviteData = () => {
    setIsLoading(true);

    api
      .getInvites(
        "<token>",
        {},
        {
          id: currentProject.id,
        }
      )
      .then((res) => {
        setInvites(res.data);
        setIsLoading(false);
      })
      .catch((err) => console.log(err));
  };

  const createInvite = () => {
    api
      .createInvite("<token>", { email }, { id: currentProject.id })
      .then(() => {
        getInviteData();
        setEmail("");
      })
      .catch((err) => console.log(err));
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
      .then(getInviteData)
      .catch((err) => console.log(err));
  };

  const replaceInvite = (inviteEmail: string, inviteId: number) => {
    api
      .createInvite(
        "<token>",
        { email: inviteEmail },
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
      .then(getInviteData)
      .catch((err) => console.log(err));
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

  const columns = useMemo<
    Column<{
      email: string;
      id: number;
      status: string;
      invite_link: string;
    }>[]
  >(
    () => [
      {
        Header: "Mail address",
        accessor: "email",
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
        Header: "Invite link",
        accessor: "invite_link",
        Cell: ({ row }) => {
          if (row.values.status === "expired") {
            return (
              <NewLinkButton
                onClick={() => replaceInvite(row.values.email, row.values.id)}
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
        accessor: "id",
        Cell: ({ row }) => {
          if (row.values.status === "accepted") {
            return <CopyButton invis={true}>Remove</CopyButton>;
          }
          return (
            <>
              <CopyButton onClick={() => deleteInvite(row.values.id)}>
                Delete Invite
              </CopyButton>
            </>
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

    const mappedInviteList = inviteList.map(
      ({ accepted, expired, token, ...rest }) => {
        if (accepted) {
          return {
            status: "accepted",
            invite_link: buildInviteLink(token),
            ...rest,
          };
        }

        if (!accepted && expired) {
          return {
            status: "expired",
            invite_link: buildInviteLink(token),
            ...rest,
          };
        }

        return {
          status: "pending",
          invite_link: buildInviteLink(token),
          ...rest,
        };
      }
    );

    return mappedInviteList || [];
  }, [invites, currentProject?.id, window?.location?.host, isHTTPS]);

  return (
    <>
      <Heading isAtTop={true}>Share Project</Heading>
      <Helper>Generate a project invite for another admin user.</Helper>
      <InputRowWrapper>
        <InputRow
          value={email}
          type="text"
          setValue={(newEmail: string) => setEmail(newEmail)}
          width="100%"
          placeholder="ex: mrp@getporter.dev"
        />
      </InputRowWrapper>
      <ButtonWrapper>
        <InviteButton disabled={false} onClick={() => validateEmail()}>
          Create Invite
        </InviteButton>
        {isInvalidEmail && (
          <Invalid>Invalid email address. Please try again.</Invalid>
        )}
      </ButtonWrapper>

      <Heading>Invites & Collaborators</Heading>
      <Helper>Manage pending invites and view collaborators.</Helper>
      {isLoading && <Loading height={"30%"} />}
      {data?.length && !isLoading ? (
        <Table
          columns={columns}
          data={data}
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
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
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
