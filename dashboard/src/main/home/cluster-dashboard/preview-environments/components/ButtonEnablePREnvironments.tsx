import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import pr_icon from "assets/pull_request_icon.svg";
import { Link } from "react-router-dom";
import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";

// TODO: Billing is still not capable to show if a user can use or not PR environments, add that instead of "hasBillingEnabled"
const ButtonEnablePREnvironments = () => {
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
        <Loading />
      </Container>
    );
  }
  return (
    <>
      <Container>
        <Button {...getButtonProps()}>
          <img src={pr_icon} alt="Pull request icon" />
          Enable Preview Environments
        </Button>
      </Container>
    </>
  );
};

export default ButtonEnablePREnvironments;

const Button = styled(DynamicLink)`
  background-color: #616feecc;
  border: none;
  border-radius: 6px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  img {
    margin-right: 10px;
    width: 20px;
    height: 20px;
  }
  transition: background-color 150ms ease-out;
  :hover {
    background-color: #616feefb;
  }
`;

const Container = styled.div`
  width: 50%;
  display: flex;
  margin-top: 20px;
`;
