import React, { useContext, useMemo, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import { Environment } from "../types";
import Helper from "components/form-components/Helper";
import api from "shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { validatePorterYAML } from "../utils";
import Banner from "components/Banner";
import { useRouting } from "shared/routing";
import PorterYAMLErrorsModal from "../components/PorterYAMLErrorsModal";
import Placeholder from "components/Placeholder";
import _ from "lodash";
import Loading from "components/Loading";
import { EllipsisTextWrapper } from "../components/styled";
import pr_icon from "assets/pull_request_icon.svg";
import { search } from "shared/search";
import RadioFilter from "components/RadioFilter";
import sort from "assets/sort.svg";

interface Props {
  environmentID: string;
}

const CreateBranchEnvironment = ({ environmentID }: Props) => {
  const queryClient = useQueryClient();
  const router = useRouting();
  const [searchValue, setSearchValue] = useState("");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [loading, setLoading] = useState<boolean>(false);
  const [showErrorsModal, setShowErrorsModal] = useState<boolean>(false);
  const {
    currentProject,
    currentCluster,
    setCurrentError,
  } = useContext(Context);

  const {
    data: environment,
    isLoading: environmentLoading,
  } = useQuery<Environment>(
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

  const environmentGitDeployBranches = environment?.git_deploy_branches ?? [];
  const [selectedBranch, setSelectedBranch] = useState<string>(null);
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["branches"],
    });
  };

  const filteredBranches = useMemo(() => {
    const filteredBySearch = search<string>(
      branches ?? [],
      searchValue,
      {
        isCaseSensitive: false,
      }
    );

    switch (sortOrder) {
      case "Alphabetical":
      default:
        return _.sortBy(filteredBySearch);
    }
  }, [branches, searchValue, sortOrder]);

  const updateDeployBranchesMutation = useMutation({
    mutationFn: () => {
      return api.updateEnvironment(
        "token",
        {
          disable_new_comments: environment.new_comments_disabled,
          ...environment,
          git_deploy_branches: _.uniq(
            [
              ...environmentGitDeployBranches,
              selectedBranch,
            ]
          ),
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: environment.id,
        }
      );
    },
    onError: (err) => {
      setCurrentError(err as string);
    },
    onSuccess: () =>
      router.push(
        `/preview-environments/deployments/${environmentID}/${environment.git_repo_name}/${environment.git_repo_owner}?status_filter=all`
      ),
  });

  if (branchesLoading || environmentLoading) {
    return (
      <>
        <Br height="30px" />
        <Placeholder minHeight="50vh">
          <Loading />
        </Placeholder>
      </>
    );
  }

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
      <Br height="7px" />
      <Helper>
        Select a branch to preview. Branches must contain a{" "}
        <Code>porter.yaml</Code> file.
      </Helper>
      <DarkMatter />
      <FlexRow>
        <Flex>
          <SearchRowWrapper>
            <SearchBarWrapper>
              <i className="material-icons">search</i>
              <SearchInput
                value={searchValue}
                onChange={(e: any) => {
                  setSelectedBranch(undefined);
                  setPorterYAMLErrors([]);
                  setSearchValue(e.target.value);
                }}
                placeholder="Search"
              />
            </SearchBarWrapper>
          </SearchRowWrapper>
        </Flex>
        <Flex>
          <RefreshButton color={"#7d7d81"} onClick={handleRefresh}>
            <i className="material-icons">refresh</i>
          </RefreshButton>
          <RadioFilter
            icon={sort}
            selected={sortOrder}
            setSelected={setSortOrder}
            options={[
              { label: "Alphabetical", value: "Alphabetical" },
            ]}
            name="Sort"
          />
        </Flex>
      </FlexRow>
      <BranchList>
      {
        (filteredBranches ?? []).map((branch, i) => (
          <BranchRow
            onClick={() => handleRowItemClick(branch)}
            isLast={i === filteredBranches.length - 1}
            isSelected={branch === selectedBranch}
          >
            <BranchName>
              <BranchIcon src={pr_icon} alt="branch icon" />
                <EllipsisTextWrapper tooltipText={branch}>
                  {branch}
                </EllipsisTextWrapper>
            </BranchName>
          </BranchRow>
        ))
      }
      </BranchList>
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
          onClick={() => updateDeployBranchesMutation.mutate()}
          disabled={
            updateDeployBranchesMutation.isLoading || loading
            || porterYAMLErrors.length > 0 || !selectedBranch
          }
        >
          {
            updateDeployBranchesMutation.isLoading ? 'Creating...' : 'Create Preview Deployment'
          }
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

const DarkMatter = styled.div`
  height: 0px;
  width: 100%;
  margin-top: -10px;
`;

const BranchList = styled.div`
  border: 1px solid #494b4f;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 33px;
`;

const BranchRow = styled.div<{ isLast?: boolean; isSelected?: boolean }>`
  width: 100%;
  padding: 15px;
  padding-bottom: 8px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#ffffff11" : "#26292e")};
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #494b4f")};
  :hover {
    background: #ffffff11;
  }
`;

const SearchRowWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  margin-right: 10px;
  background: #26292e;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
  border-radius: 5px;
  width: 250px;
`;

const SearchBarWrapper = styled.div`
  display: flex;
  flex: 1;

  > i {
    color: #aaaabb;
    padding-top: 1px;
    margin-left: 8px;
    font-size: 16px;
    margin-right: 8px;
  }
`;

const BranchName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  align-items: center;
  margin-bottom: 10px;
`;

const Code = styled.span`
  font-family: monospace; ;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
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

const BranchIcon = styled.img`
  font-size: 20px;
  height: 16px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
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

const SearchInput = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 100%;
  color: white;
  height: 100%;
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
  font-weight: bold;
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

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props: { color: string }) => props.color};
  cursor: pointer;
  border: none;
  width: 30px;
  height: 30px;
  margin-right: 15px;
  background: none;
  border-radius: 50%;
  margin-left: 10px;
  > i {
    font-size: 20px;
  }
  :hover {
    background-color: rgb(97 98 102 / 44%);
    color: white;
  }
`;