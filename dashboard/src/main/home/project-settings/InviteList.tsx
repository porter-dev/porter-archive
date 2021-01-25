import React, { Component } from 'react';
import styled from 'styled-components';

import { InviteType } from '../../../shared/types';
import api from '../../../shared/api';
import { Context } from '../../../shared/Context';

import Loading from '../../../components/Loading';
import InputRow from '../../../components/values-form/InputRow';
import Helper from '../../../components/values-form/Helper';
import Heading from '../../../components/values-form/Heading';

type PropsType = {
}

type StateType = {
  loading: boolean,
  invites: InviteType[],
  email: string,
  invalidEmail: boolean,
}

export default class InviteList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    invites: [] as InviteType[],
    email: '',
    invalidEmail: false,
  }

  componentDidMount() {
    this.getInviteData();
  }

  getInviteData = () => {
    let { currentProject } = this.context;
    
    this.setState({ loading: true })
    api.getInvites('<token>', {}, {
      id: currentProject.id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        this.setState({ invites: res.data, loading: false }, () => {
          for (let i = this.state.invites.length - 1; i >= 0; i--) {
            if (this.state.invites[i].expired && !this.state.invites[i].accepted) {
              api.deleteInvite('<token>', {}, {
                id: currentProject.id, invId: this.state.invites[i].id
              }, (err: any, res: any) => {
                if (err) {
                  console.log(`Error deleting invite: ${err}`);
                } else {
                  this.state.invites.splice(i, 1);
                }
              })
            }
          }
        });
      }
    });
  }

  validateEmail = () => {
    var regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (regex.test(this.state.email.toLowerCase())) {
      this.setState({ invalidEmail: false });
      this.createInvite();
    } else {
      this.setState({ invalidEmail: true });
    }
  }

  createInvite = () => {
    let { currentProject } = this.context;
    api.createInvite('<token>', { email: this.state.email }, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        this.getInviteData();
        this.setState({ email: '' });
      }
    })
  }

  deleteInvite = (index: number) => {
    let { currentProject } = this.context;
    api.deleteInvite('<token>', {}, {
      id: currentProject.id, invId: this.state.invites[index].id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        this.getInviteData();
      }
    })
  }

  replaceInvite = (index: number) => {
    let { currentProject } = this.context;
    api.createInvite('<token>', { email: this.state.invites[index].email }, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        api.deleteInvite('<token>', {}, {
          id: currentProject.id, invId: this.state.invites[index].id
        }, (err: any, res: any) => {
          if (err) {
            console.log(err);
          } else {
            this.getInviteData();
          }
        })
      }
    })
  }

  copyToClip = (index: number) => {
    let { currentProject } = this.context;
    navigator.clipboard.writeText(
      `${process.env.API_SERVER}/api/projects/${currentProject.id}/invites/${this.state.invites[index].token}`
    ).then(function() {
    }, function() {
      console.log("couldn't copy link to clipboard");
    })
  }

  renderInvitations = () => {
    let { currentProject } = this.context;
    if (this.state.loading) {
      return (
        <Loading />
      )
    } else {
      var invContent: any[] = [];
      for (let i = 0; i < this.state.invites.length; i++) {
        if (this.state.invites[i].accepted) {
          invContent.push(
            <Tr key={i}>
              <MailTd isTop={i === 0}>
                {this.state.invites[i].email}
              </MailTd>
              <LinkTd isTop={i === 0}>
              </LinkTd>
              <Td isTop={i === 0} invis={true}>
                <CopyButton
                  onClick={() => this.deleteInvite(i)}
                >
                  Remove
                </CopyButton>
              </Td>
            </Tr>
          )
        } else if (this.state.invites[i].expired) {
          invContent.push(
            <Tr key={i}>
              <MailTd isTop={i === 0}>
                {this.state.invites[i].email}
              </MailTd>
              <LinkTd isTop={i === 0}>
                <Rower>
                  <ShareLink
                    disabled={true}
                    type='string'
                    placeholder='Link expired'
                  />
                  <CopyButton
                    onClick={() => this.replaceInvite(i)}
                  >
                    Get New Link
                  </CopyButton>
                </Rower>
              </LinkTd>
              <Td isTop={i === 0}>
                <CopyButton
                  onClick={() => this.deleteInvite(i)}
                >
                  Delete Invite
                </CopyButton>
              </Td>
            </Tr>
          )
        } else {
          invContent.push(
            <Tr key={i}>
              <MailTd isTop={i === 0}>
                {this.state.invites[i].email}
              </MailTd>
              <LinkTd isTop={i === 0}>
                <Rower>
                  <ShareLink
                    disabled={true}
                    type='string'
                    value={`${process.env.API_SERVER}/api/projects/${currentProject.id}/invites/${this.state.invites[i].token}`}
                    placeholder='Unable to retrieve link'
                  />
                  <CopyButton
                    onClick={() => this.copyToClip(i)}
                  >
                    Copy Link
                  </CopyButton>
                </Rower>
              </LinkTd>
              <Td isTop={i === 0}>
                <CopyButton
                  onClick={() => this.deleteInvite(i)}
                >
                  Delete Invite
                </CopyButton>
              </Td>
            </Tr>
          )
        }
      }
      return (
        <>
          <Subsubtitle>Collaborators</Subsubtitle>
          {invContent.length > 0
            ? <Table><tbody>{invContent}</tbody></Table>
            : <BodyText>This project currently has no collaborators.</BodyText>
          }
        </>
      )
    }
  }

  render() {
    return (
      <>
        <Heading isAtTop={true}>Share Project</Heading>
        <Helper>Generate a project invite for another admin user:</Helper>
        <CreateInvite>
          <InputRow
            value={this.state.email}
            type='text'
            setValue={(x: string) => this.setState({ email: x })}
            width='calc(100%)'
            placeholder='ex: mrp@getporter.dev'
          />
          <InviteButton
            onClick={() => this.validateEmail()}
          >
            Create Invite
          </InviteButton>
        </CreateInvite>
        {this.state.invalidEmail &&
          <Invalid>
            Invalid Email Address. Try Again.
          </Invalid>
        }
        {this.renderInvitations()}
      </>
    )
  }
}

InviteList.contextType = Context;

const Subtitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  font-family: 'Work Sans', sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 24px;
  margin-top: 32px;
`;

const Subsubtitle = styled.div`
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 12px;
`;

const BodyText = styled.div`
  color: #ffffff66;
  font-weight: 400;
  font-size: 13px;
`;

const CopyButton = styled.div`
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
  margin-left: 12px;
  float: right;
  width: 128px;
  padding-top: 7px;
  padding-bottom: 6px;
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

const InviteButton = styled(CopyButton)`
  margin-bottom: 14px;
`;

const Rower = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const CreateInvite = styled.div`
  flex-direction: row;
  align-items: center;
  margin-top: -10px;
`;

const ShareLink = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  width: 50%;
  color: #74a5f7;
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
  border-radius: 5px;
`;

const Td = styled.td`
  visibility: ${(props: { isTop: boolean, invis?: boolean }) => props.invis ? 'hidden' : 'visible'};
  white-space: nowrap;
  padding: 20px 0px;
  border-top: ${(props: { isTop: boolean, invis?: boolean }) => (props.isTop ? 'none' : '1px solid #ffffff55')};
  &:last-child {
    padding-right: 16px;
  }
`;

const Tr = styled.tr`
`;

const MailTd = styled(Td)`
  padding-left: 16px;
  max-width: 242px;
  min-width: 242px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
`;

const LinkTd = styled(Td)`
  width: 100%;
`;

const Invalid = styled.div`
  margin-top: -26px;
  margin-bottom: 26px;
  color: #fa0a26;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
`;