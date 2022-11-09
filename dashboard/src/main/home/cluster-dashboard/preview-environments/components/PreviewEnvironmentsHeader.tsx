import React, { useEffect, useState } from "react";
import styled from "styled-components";
import DashboardHeader from "../../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import api from "shared/api";
import Banner from "components/Banner";

export const PreviewEnvironmentsHeader = () => {
  const [githubStatus, setGithubStatus] = useState<string>(
    "no active incidents"
  );

  useEffect(() => {
    api
      .getGithubStatus("<token>", {}, {})
      .then(({ data }) => {
        setGithubStatus(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <>
      <DashboardHeader
        image={PullRequestIcon}
        title="Preview environments"
        description="Create full-stack preview environments for your pull requests."
        disableLineBreak
        capitalize={false}
      />
      {githubStatus != "no active incidents" ? (
        <Banner type="error">
          GitHub has an ongoing incident.
          <StyledLink href={`${githubStatus}`} target="_blank">
            View details
          </StyledLink>
        </Banner>
      ) : null}
    </>
  );
};

const StyledLink = styled.a`
  text-decoration: underline;
  margin-left: 7px;  
`;

const AlertCard = styled.div`
  transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  border-radius: 4px;
  box-shadow: none;
  font-weight: 400;
  font-size: 0.875rem;
  line-height: 1.43;
  letter-spacing: 0.01071em;
  border: 1px solid rgb(229, 115, 115);
  display: flex;
  padding: 6px 16px;
  color: rgb(244, 199, 199);
  margin-top: 20px;
  position: relative;
  margin-bottom: 20px;
`;

const AlertCardIcon = styled.span`
  color: rgb(239, 83, 80);
  margin-right: 12px;
  padding: 7px 0px;
  display: flex;
  font-size: 22px;
  opacity: 0.9;
`;

const AlertCardTitle = styled.div`
  margin: -2px 0px 0.35em;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.00938em;
  font-weight: 500;
`;

const AlertCardContent = styled.div`
  padding: 8px 0px;
`;
