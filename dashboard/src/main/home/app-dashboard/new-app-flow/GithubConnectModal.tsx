import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";
import React, { useEffect, useState } from "react";

import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import Button from "components/porter/Button";

import api from "shared/api";
import Error from "components/porter/Error";

import Helper from "components/form-components/Helper";
import github from "assets/github-white.png";

type Props = RouteComponentProps & {
  closeModal: () => void;
  hasClickedDoNotConnect: boolean;
  handleDoNotConnect: () => void;
  setAccessError: (error: boolean) => void;
  setAccessLoading: (loading: boolean) => void;
  setAccessData: (data: GithubAppAccessData) => void;
  accessData: GithubAppAccessData;
  accessError: boolean;
};

interface GithubAppAccessData {
  username?: string;
  accounts?: string[];
  accessError?: boolean;
}

const GithubConnectModal: React.FC<Props> = ({
  closeModal,
  hasClickedDoNotConnect,
  handleDoNotConnect,
  accessError,
  setAccessError,
  setAccessLoading,
  setAccessData,
  accessData,
}) => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  const encoded_redirect_uri = encodeURIComponent(url);

  const renderGithubConnect = () => {
    const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const encoded_redirect_uri = encodeURIComponent(url);

    if (accessError) {
      return (
        <>
          <Text color="helper">To deploy from GitHub, authorize Porter to view your repos.</Text> 
          <ListWrapper>
            <Helper>
              No connected repos found.
              <A href={"/api/integrations/github-app/oauth"}>
                Authorize Porter to view your repos.
              </A>
            </Helper>
          </ListWrapper>
          <Spacer y={1} />
          <Button
            onClick={handleDoNotConnect}
            loadingText="Submitting..."
            color="#ffffff11"
            status={loading ? "loading" : undefined}
          >
            Dismiss
          </Button>
        </>
      );
    } else if (!accessData.accounts || accessData.accounts?.length == 0) {
      return (
        <>
          <Text color="helper">
            You are currently authorized as <B>{accessData.username}</B>.
          </Text>
          <Spacer y={1} />
          <ConnectToGithubButton
            href={`/api/integrations/github-app/install?redirect_uri=${encoded_redirect_uri}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeModal}
          >
            <GitHubIcon src={github} />
            Install the Porter GitHub app
          </ConnectToGithubButton>
          <Spacer y={1} />
          <Button
            onClick={handleDoNotConnect}
            loadingText="Submitting..."
            color="#ffffff11"
            withBorder
            status={loading ? "loading" : undefined}
          >
            Dismiss
          </Button>
        </>
      );
    }
  };
  useEffect(() => {
    api
      .getGithubAccounts("<token>", {}, {})
      .then(({ data }) => {
        setAccessData(data);
        setAccessLoading(false);
      })
      .catch(() => {
        setAccessError(true);
        setAccessLoading(false);
      });
  }, []);
  return (
    !hasClickedDoNotConnect &&
    (accessError ||
      !accessData.accounts ||
      accessData.accounts?.length === 0) && (
      <>
        <Modal closeModal={closeModal}>
          <Text size={16}>
            <GitIcon src={github} />
            Configure GitHub
          </Text>
          <Spacer y={0.5} />
          {renderGithubConnect()}
        </Modal>
      </>
    )
  );
};

export default withRouter(GithubConnectModal);

const B = styled.b`
  display: inline;
  color: #ffffff;
  margin-left: 5px;
`;

const GitIcon = styled.img`
  width: 15px;
  height: 15px;
  opacity: 0.9;
  margin-right: 10px;
  filter: brightness(120%);
`;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

const ModalHeader = styled.div`
  font-weight: 600;
  font-size: 16px;
  font-family: monospace;
  height: 40px;
  display: flex;
  align-items: center;
`;

const ListWrapper = styled.div`
  width: 100%;
  height: 240px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin-top: 20px;
  padding: 40px;
`;
const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;

const ConnectToGithubButton = styled.a`
  width: 240px;
  justify-content: center;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  color: white;
  font-weight: 500;
  padding: 10px;
  overflow: hidden;
  white-space: nowrap;
  border: 1px solid #494b4f;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#2E3338"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#353a3e"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
  &:hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#353a3e"};
  }

  &:not([disabled]) {
    cursor: pointer;
  }
`;

const GitHubIcon = styled.img`
  width: 20px;
  filter: brightness(150%);
  margin-right: 10px;
`;
const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;
