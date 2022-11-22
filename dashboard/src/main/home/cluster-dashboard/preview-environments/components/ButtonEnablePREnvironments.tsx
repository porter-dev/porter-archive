import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import pr_icon from "assets/pull_request_icon.svg";
import { Link } from "react-router-dom";
import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";

type Props = {
  setIsReady: (status: boolean) => void;
};

// TODO: Billing is still not capable to show if a user can use or not PR environments, add that instead of "hasBillingEnabled"
const ButtonEnablePREnvironments = ({ setIsReady }: Props) => {
  // const { hasBillingEnabled } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGHAccountConnected, setHasGHAccountConnected] = useState(false);
  let hasBillingEnabled = true;

  const getAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getGithubAccounts("<token>", {}, {});
      if (res.status !== 200) {
        throw new Error("Not authorized");
      }

      return res.data;
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    getAccounts().then((accountsData) => {
      if (isSubscribed) {
        if (!accountsData) {
          setHasGHAccountConnected(false);
        } else {
          setHasGHAccountConnected(true);
        }
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    setIsReady(!isLoading);
  }, [isLoading]);

  const getButtonProps = () => {
    const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

    const encoded_redirect_uri = encodeURIComponent(url);

    const backendUrl = `${window.location.protocol}//${window.location.host}`;

    if (!hasGHAccountConnected) {
      return {
        to: `${backendUrl}/api/integrations/github-app/install?redirect_uri=${encoded_redirect_uri}`,
        target: "_self",
      };
    }

    if (!hasBillingEnabled) {
      return {
        to: {
          pathname: "/project-settings",
          search: "?selected_tab=billing",
        },
      };
    }
    return {
      to: "/preview-environments/connect-repo",
    };
  };

  if (isLoading) {
    return (
      <Container>
        <Button disabled={true} to="">
          <img src={pr_icon} alt="Pull request icon" />
          Loading . . .
        </Button>
      </Container>
    );
  }

  if (!hasGHAccountConnected) {
    return (
      <>
        <Container>
          <Button {...getButtonProps()}>
            <img src={pr_icon} alt="Pull request icon" />
            Connect GitHub account
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <Container>
        <Button {...getButtonProps()}>
          <i className="material-icons">add</i> Add repository
        </Button>
      </Container>
    </>
  );
};

export default ButtonEnablePREnvironments;

const Button = styled(DynamicLink)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  color: white;
  height: 30px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  img {
    margin-left: 2px;
    margin-right: 5px;
    width: 18px;
    height: 18px;
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
`;

const Container = styled.div`
`;
