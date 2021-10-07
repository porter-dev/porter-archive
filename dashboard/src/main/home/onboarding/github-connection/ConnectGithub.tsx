import Button from "components/Button";
import Helper from "components/form-components/Helper";
import TitleSection from "components/TitleSection";
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

/**
 * First step of the flow showing simple Connect to github button, this should
 * redirect to the github flow in this order
 * Has registered through github? Yes -> /api/integrations/github-app/install
 * Hasn't registered through github? -> /api/integrations/github-app/oauth -> /api/integrations/github-app/install
 *
 * That way we can be sure that the we have full credentials to launch apps from the user repos.
 *
 * The other option would be skip integration, that will skip the whole github connection flow.
 */
const ConnectGithub = () => {
  return (
    <>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 1 of 3</Subtitle>
      <Helper>
        To deploy applications from your repo, you need to connect a Github
        account
      </Helper>
      {/* Pending: Check with alex where to change the redirect URL and if that can be dynamic (in order to not break other app stuff) */}
      <ConnectToGithubButton href="/api/integrations/github-app/oauth">
        Connect to github
      </ConnectToGithubButton>
      <Helper>
        No thanks, I want to deploy from a{" "}
        <Link to={"/onboarding/provision"}>Docker registry</Link>
      </Helper>
    </>
  );
};

export default ConnectGithub;

const Subtitle = styled(TitleSection)`
  font-size: 16px;
  margin-top: 16px;
`;

const ConnectToGithubButton = styled.a`
  width: 150px;
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
