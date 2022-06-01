import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import branch_icon from "assets/branch.png";

import api from "../../shared/api";
import { Context } from "../../shared/Context";
import { ActionConfigType } from "../../shared/types";

import Loading from "../Loading";
import SearchBar from "../SearchBar";

type Props = {
  actionConfig: ActionConfigType;
  setBranch: (x: string) => void;
};

const BranchList: React.FC<Props> = ({ setBranch, actionConfig }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState(null);

  const { currentProject } = useContext(Context);

  useEffect(() => {
    // Get branches
    if (!actionConfig) {
      return () => {};
    }

    if (actionConfig?.kind === "github") {
      api
        .getBranches(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            git_repo_id: actionConfig.git_repo_id,
            kind: "github",
            owner: actionConfig.git_repo.split("/")[0],
            name: actionConfig.git_repo.split("/")[1],
          }
        )
        .then((res) => {
          setBranches(res.data);
          setLoading(false);
          setError(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
          setError(true);
        });
    } else {
      api
        .getGitlabBranches(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            integration_id: actionConfig.gitlab_integration_id,
            repo_owner: actionConfig.git_repo.split("/")[0],
            repo_name: actionConfig.git_repo.split("/")[1],
          }
        )
        .then((res) => {
          setBranches(res.data);
          setLoading(false);
          setError(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
          setError(true);
        });
    }
  }, []);

  const renderBranchList = () => {
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error || !branches) {
      return <LoadingWrapper>Error loading branches</LoadingWrapper>;
    }

    let results =
      searchFilter != null
        ? branches.filter((branch) => {
            return branch
              .toLowerCase()
              .includes(searchFilter.toLowerCase() || "");
          })
        : branches.slice(0, 10);

    if (results.length == 0) {
      return <LoadingWrapper>No matching Branches found.</LoadingWrapper>;
    }
    return results.map((branch: string, i: number) => {
      return (
        <BranchName
          key={i}
          lastItem={i === branches.length - 1}
          onClick={() => setBranch(branch)}
        >
          <img src={branch_icon} alt={"branch icon"} />
          {branch}
        </BranchName>
      );
    });
  };

  return (
    <>
      <SearchBar
        setSearchFilter={setSearchFilter}
        disabled={error || loading}
        prompt={"Search branches..."}
      />
      <BranchListWrapper>
        <ExpandedWrapper>{renderBranchList()}</ExpandedWrapper>
      </BranchListWrapper>
    </>
  );
};

export default BranchList;

const BranchName = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ffffff44;
`;

const BranchListWrapper = styled.div`
  border: 1px solid #ffffff55;
  border-radius: 3px;
  overflow-y: auto;
`;

const ExpandedWrapper = styled.div`
  width: 100%;
  border-radius: 3px;
  border: 0px solid #ffffff44;
  max-height: 221px;
  top: 40px;

  > i {
    font-size: 18px;
    display: block;
    position: absolute;
    left: 10px;
    top: 10px;
  }
`;
