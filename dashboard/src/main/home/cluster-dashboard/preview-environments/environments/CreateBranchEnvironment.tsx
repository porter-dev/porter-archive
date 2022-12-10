import React, { useContext, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import { Environment } from "../types";
import Helper from "components/form-components/Helper";
import api from "shared/api";
import { useQuery } from "@tanstack/react-query";
import { validatePorterYAML } from "../utils";
import Banner from "components/Banner";
import { useRouting } from "shared/routing";
import PorterYAMLErrorsModal from "../components/PorterYAMLErrorsModal";
import Placeholder from "components/Placeholder";
import BranchFilterSelector from "../components/BranchFilterSelector";
import _ from "lodash";

interface Props {
  environmentID: string;
}

const CreateBranchEnvironment = ({ environmentID }: Props) => {
  const router = useRouting();
  const [showErrorsModal, setShowErrorsModal] = useState<boolean>(false);
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const { data: environment } = useQuery<Environment>(
    ["environment", currentProject.id, currentCluster.id, environmentID],
    async () => {
      const { data: environment } = await api.getEnvironment<Environment>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: parseInt(environmentID),
        }
      );

      return environment;
    }
  );

  // Get all branches for the current environment
  const { isLoading: branchesLoading, data: branches } = useQuery<string[]>(
    ["branches", currentProject.id, currentCluster.id, environment],
    async () => {
      try {
        const res = await api.getBranches<string[]>(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            kind: "github",
            name: environment.git_repo_name,
            owner: environment.git_repo_owner,
            git_repo_id: environment.git_installation_id,
          }
        );
        return res.data ?? [];
      } catch (err) {
        setCurrentError(
          "Couldn't load branches for this repository, please try again later."
        );
      }
    },
    {
      enabled: !!environment,
    }
  );

  const [selectedBranch, setSelectedBranch] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [porterYAMLErrors, setPorterYAMLErrors] = useState<string[]>([]);

  const handleRowItemClick = async (branch: string) => {
    setSelectedBranch(branch);
    setLoading(true);

    const res = await validatePorterYAML({
      projectID: currentProject.id,
      clusterID: currentCluster.id,
      environmentID: Number(environmentID),
      branch,
    });

    setPorterYAMLErrors(res.data.errors ?? []);

    setLoading(false);
  };

  const handleCreatePreviewDeployment = async () => {
    try {
      //   await api.createPreviewEnvironmentDeployment(
      //     "<token>",
      //     {
      //       pr_title: "",
      //       pr_number: 0,
      //       repo_owner: environment.git_repo_name,
      //       repo_name: environment.git_repo_owner,
      //       branch_from: selectedBranch,
      //       branch_into: selectedBranch,
      //     },
      //     {
      //       cluster_id: currentCluster?.id,
      //       project_id: currentProject?.id,
      //     }
      //   );

      throw Error("Not implemented yet. (CreateBranchEnvironment.tsx:");

      router.push(
        `/preview-environments/deployments/${environmentID}/${environment.git_repo_name}/${environment.git_repo_owner}?status_filter=all`
      );
    } catch (err) {
      setCurrentError(err);
    }
  };

  if (!branches?.length) {
    return (
      <>
        <Br height="30px" />
        <Placeholder height="370px">You do not have any branches.</Placeholder>
      </>
    );
  }

  return (
    <>
      <Helper>
        Select a branch to preview. Branches must contain a{" "}
        <Code>porter.yaml</Code> file.
      </Helper>
      <Br height="10px" />
      <BranchFilterSelector
        onChange={(branches) => setSelectedBranch(branches[0])}
        options={branches}
        value={_.compact([selectedBranch])}
        showLoading={branchesLoading}
        multiSelect={false}
      />
      {showErrorsModal && selectedBranch ? (
        <PorterYAMLErrorsModal
          errors={porterYAMLErrors}
          onClose={() => setShowErrorsModal(false)}
          repo={environment.git_repo_name + "/" + environment.git_repo_owner}
          branch={selectedBranch}
        />
      ) : null}
      {selectedBranch && porterYAMLErrors.length ? (
        <ValidationErrorBannerWrapper>
          <Banner type="warning">
            We found some errors in the porter.yaml file in the&nbsp;
            {selectedBranch}&nbsp;branch. &nbsp;
            <LearnMoreButton onClick={() => setShowErrorsModal(true)}>
              Learn more
            </LearnMoreButton>
          </Banner>
        </ValidationErrorBannerWrapper>
      ) : null}
      <CreatePreviewDeploymentWrapper>
        <SubmitButton
          onClick={handleCreatePreviewDeployment}
          disabled={loading || !selectedBranch || porterYAMLErrors.length > 0}
        >
          Create preview deployment
        </SubmitButton>
        {selectedBranch && porterYAMLErrors.length ? (
          <RevalidatePorterYAMLSpanWrapper>
            Please fix your porter.yaml file to continue.{" "}
            <RevalidateSpan
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!selectedBranch) {
                  return;
                }

                handleRowItemClick(selectedBranch);
              }}
            >
              Refresh
            </RevalidateSpan>
          </RevalidatePorterYAMLSpanWrapper>
        ) : null}
      </CreatePreviewDeploymentWrapper>
    </>
  );
};

export default CreateBranchEnvironment;

const PullRequestRow = styled.div<{ isLast?: boolean; isSelected?: boolean }>`
  width: 100%;
  padding: 15px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#ffffff11" : "#26292e")};
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #494b4f")};
  :hover {
    background: #ffffff11;
  }
`;

const Code = styled.span`
  font-family: monospace; ;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 10px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-top: -1px;
  margin-left: 10px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const MergeInfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 8px;
  position: relative;
  margin-left: 10px;
`;

const MergeInfo = styled.div`
  font-size: 13px;
  align-items: center;
  color: #aaaabb66;
  white-space: nowrap;
  display: flex;
  align-items: center;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 300px;

  > i {
    font-size: 16px;
    margin: 0 2px;
  }
`;

const PRIcon = styled.img`
  font-size: 20px;
  height: 16px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
`;

const PRName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  align-items: center;
  margin-bottom: 10px;
`;

const SubmitButton = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  font-weight: 500;
  color: white;
  height: 30px;
  padding: 0 8px;
  width: 200px;
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

const Br = styled.div<{ height: string }>`
  width: 100%;
  height: ${(props) => props.height || "2px"};
`;

const ValidationErrorBannerWrapper = styled.div`
  margin-block: 20px;
`;

const LearnMoreButton = styled.div`
  text-decoration: underline;
  fontweight: bold;
  cursor: pointer;
`;

const CreatePreviewDeploymentWrapper = styled.div`
  margin-top: 30px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const RevalidatePorterYAMLSpanWrapper = styled.div`
  font-size: 13px;
  color: #aaaabb;
`;

const RevalidateSpan = styled.span`
  color: #aaaabb;
  text-decoration: underline;
  cursor: pointer;
`;
