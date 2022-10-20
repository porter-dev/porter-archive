import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { Context } from "shared/Context";
import { useParams } from "react-router";
import { PRDeployment } from "../types";
import DashboardHeader from "../../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import Helper from "components/form-components/Helper";

const CreateEnvironment: React.FC = () => {
  const { environment_id, repo_name, repo_owner } = useParams<{
    environment_id: string;
    repo_name: string;
    repo_owner: string;
  }>();

  const selectedRepo = `${repo_owner}/${repo_name}`;
 
  return (
    <>
      <BreadcrumbRow>
        <Breadcrumb
          to={`/preview-environments/deployments/settings`}
        >
          <ArrowIcon src={PullRequestIcon} />
          <Wrap>Preview environments</Wrap>
        </Breadcrumb>
        <Slash>/</Slash>
        <Breadcrumb
          to={`/preview-environments/deployments/${environment_id}/${selectedRepo}`}
        >
          <Icon src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" />
          <Wrap>{selectedRepo}</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <DashboardHeader
        title="Create a preview deployment"
        disableLineBreak
        capitalize={false}
      />
      <DarkMatter />
      <Helper>Select an open pull request to preview.</Helper>
    </>
  );
};

export default CreateEnvironment;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -15px;
`;

const DeleteButton = styled.div`
  height: 30px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  width: 210px;
  align-items: center;
  padding: 0 15px;
  margin-top: 20px;
  text-align: left;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: brightness(120%);
  }
  background: #b91133;
  border: none;
  :hover {
    filter: brightness(120%);
  }
`;

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const StyledPlaceholder = styled.div`
  width: 100%;
  padding: 30px;
  font-size: 13px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
`;

const Slash = styled.div`
  margin: 0 4px;
  color: #aaaabb88;
`;

const Wrap = styled.div`
  z-index: 999;
`;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const Icon = styled.img`
  width: 15px;
  margin-right: 8px;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 15px;
  margin-top: -10px;
  align-items: center;
`;

const Breadcrumb = styled(DynamicLink)`
  color: #aaaabb88;
  font-size: 13px;
  display: flex;
  align-items: center;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const Relative = styled.div`
  position: relative;
`;

const EnvironmentsGrid = styled.div`
  padding-bottom: 150px;
  display: grid;
  grid-row-gap: 15px;
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin: 35px 0 30px;
  padding-left: 0px;
`;

const Button = styled(DynamicLink)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
