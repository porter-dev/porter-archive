import React, { Component } from "react";
import styled from "styled-components";

import { InviteType } from "shared/types";
import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "components/Loading";
import InputRow from "components/values-form/InputRow";
import Helper from "components/values-form/Helper";
import Heading from "components/values-form/Heading";

type PropsType = {};

type StateType = {
  loading: boolean;
  invites: InviteType[];
  email: string;
  invalidEmail: boolean;
  isHTTPS: boolean;
};

const dummyInvites = [];

export default class InviteList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    invites: [] as InviteType[],
    email: "",
    invalidEmail: false,
    isHTTPS: process.env.API_SERVER === "dashboard.getporter.dev",
  };

  componentDidMount() {
    this.getInviteData();
  }

  getInviteData = () => {
    let { currentProject } = this.context;

    this.setState({ loading: true });
    api
      .getInvites(
        "<token>",
        {},
        {
          id: currentProject.id,
        }
      )
      .then((res) => this.setState({ invites: res.data, loading: false }))
      .catch((err) => console.log(err));
  };

  validateEmail = () => {
    var regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (regex.test(this.state.email.toLowerCase())) {
      this.setState({ invalidEmail: false });
      this.createInvite();
    } else {
      this.setState({ invalidEmail: true });
    }
  };

  createInvite = () => {
    let { currentProject } = this.context;
    api
      .createInvite(
        "<token>",
        { email: this.state.email },
        { id: currentProject.id }
      )
      .then((_) => {
        this.getInviteData();
        this.setState({ email: "" });
      })
      .catch((err) => console.log(err));
  };

  deleteInvite = (index: number) => {
    let { currentProject } = this.context;
    api
      .deleteInvite(
        "<token>",
        {},
        {
          id: currentProject.id,
          invId: this.state.invites[index].id,
        }
      )
      .then(this.getInviteData)
      .catch((err) => console.log(err));
  };

  replaceInvite = (index: number) => {
    let { currentProject } = this.context;
    api
      .createInvite(
        "<token>",
        { email: this.state.invites[index].email },
        { id: currentProject.id }
      )
      .then((_) =>
        api.deleteInvite(
          "<token>",
          {},
          {
            id: currentProject.id,
            invId: this.state.invites[index].id,
          }
        )
      )
      .then(this.getInviteData)
      .catch((err) => console.log(err));
  };

  copyToClip = (index: number) => {
    let { currentProject } = this.context;
    navigator.clipboard
      .writeText(
        `${this.state.isHTTPS ? "https://" : ""}${
          process.env.API_SERVER
        }/api/projects/${currentProject.id}/invites/${
          this.state.invites[index].token
        }`
      )
      .then(
        function () {},
        function () {
          console.log("couldn't copy link to clipboard");
        }
      );
  };

  renderInvitations = () => {
    let { currentProject } = this.context;
    if (this.state.loading) {
      return <Loading />;
    } else {
      var invContent: any[] = [];
      var collabList: any[] = [];
      this.state.invites.sort((a: any, b: any) => (a.email > b.email ? 1 : -1));
      this.state.invites.sort((a: any, b: any) =>
        a.accepted > b.accepted ? 1 : -1
      );
      for (let i = 0; i < this.state.invites.length; i++) {
        if (this.state.invites[i].accepted) {
          collabList.push(
            <Tr key={i}>
              <MailTd isTop={i === 0}>{this.state.invites[i].email}</MailTd>
              <LinkTd isTop={i === 0}></LinkTd>
              <Td isTop={i === 0}>
                <CopyButton invis={true}>Remove</CopyButton>
              </Td>
            </Tr>
          );
        } else if (this.state.invites[i].expired) {
          invContent.push(
            <Tr key={i}>
              <MailTd isTop={i === 0}>{this.state.invites[i].email}</MailTd>
              <LinkTd isTop={i === 0}>
                <Rower>
                  Link Expired.
                  <NewLinkButton onClick={() => this.replaceInvite(i)}>
                    <u>Generate a new link</u>
                  </NewLinkButton>
                </Rower>
              </LinkTd>
              <Td isTop={i === 0}>
                <CopyButton onClick={() => this.deleteInvite(i)}>
                  Delete Invite
                </CopyButton>
              </Td>
            </Tr>
          );
        } else {
          invContent.push(
            <Tr key={i}>
              <MailTd isTop={i === 0}>{this.state.invites[i].email}</MailTd>
              <LinkTd isTop={i === 0}>
                <Rower>
                  <ShareLink
                    disabled={true}
                    type="string"
                    value={`${this.state.isHTTPS ? "https://" : ""}${
                      process.env.API_SERVER
                    }/api/projects/${currentProject.id}/invites/${
                      this.state.invites[i].token
                    }`}
                    placeholder="Unable to retrieve link"
                  />
                  <CopyButton onClick={() => this.copyToClip(i)}>
                    Copy Link
                  </CopyButton>
                </Rower>
              </LinkTd>
              <Td isTop={i === 0}>
                <CopyButton onClick={() => this.deleteInvite(i)}>
                  Delete Invite
                </CopyButton>
              </Td>
            </Tr>
          );
        }
      }

      return (
        <>
          <Heading>Invites & Collaborators</Heading>
          <Helper>Manage pending invites and view collaborators.</Helper>
          {invContent.length > 0 || collabList.length > 0 ? (
            <Table>
              <tbody>
                {invContent}
                {collabList}
              </tbody>
            </Table>
          ) : (
            <Placeholder>
              This project currently has no invites or collaborators.
            </Placeholder>
          )}
        </>
      );
    }
  };

  render() {
    return (
      <>
        <Heading isAtTop={true}>Share Project</Heading>
        <Helper>Generate a project invite for another admin user.</Helper>
        <DarkMatter />
        <InputRow
          value={this.state.email}
          type="text"
          setValue={(x: string) => this.setState({ email: x })}
          width="calc(100%)"
          placeholder="ex: mrp@getporter.dev"
        />
        <ButtonWrapper>
          <InviteButton disabled={false} onClick={() => this.validateEmail()}>
            Create Invite
          </InviteButton>
          {this.state.invalidEmail && (
            <Invalid>Invalid email address. Please try again.</Invalid>
          )}
        </ButtonWrapper>
        {this.renderInvitations()}
      </>
    );
  }
}

InviteList.contextType = Context;

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

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -10px;
`;

const CopyButton = styled.div`
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
  margin-left: 12px;
  float: right;
  width: 120px;
  padding-top: 7px;
  padding-bottom: 6px;
  cursor: pointer;
  border-radius: 5px;
  border: 1px solid #ffffff20;
  background-color: #ffffff10;
  text-align: center;
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
  background: red;
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

const Rower = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const ShareLink = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 60%;
  color: #74a5f7;
  margin-left: -10px;
  padding: 5px 10px;
  height: 30px;
  text-overflow: ellipsis;
  border-radius: 3px;
  ::placeholder,
  ::-webkit-input-placeholder {
    color: #fa0a26;
    font-weight: 600;
  }
`;

const Table = styled.table`
  width: 100%;
  border-spacing: 0px;
  border: 1px solid #ffffff55;
  margin-top: 22px;
  border-radius: 5px;
  background: #ffffff11;
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
`;

const Td = styled.td`
  white-space: nowrap;
  padding: 6px 0px;
  border-top: ${(props: { isTop: boolean }) =>
    props.isTop ? "none" : "1px solid #ffffff55"};
  &:last-child {
    padding-right: 16px;
  }
`;

const Tr = styled.tr``;

const MailTd = styled(Td)`
  padding: 0 12px;
  max-width: 186px;
  min-width: 186px;
  overflow: hidden;
  color: #aaaabb;
  text-overflow: ellipsis;
`;

const LinkTd = styled(Td)`
  width: calc(100% - 40px);
  padding-left: 40px;
`;

const Invalid = styled.div`
  color: #f5cb42;
  margin-left: 15px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;
