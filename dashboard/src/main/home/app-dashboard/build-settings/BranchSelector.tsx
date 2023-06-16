import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import branch_icon from "assets/branch.png";

import Loading from "components/Loading";
import SearchBar from "components/SearchBar";
import { Context } from "shared/Context";
import api from "shared/api";


type Props = {
  setBranch: (x: string) => void;
  currentBranch?: string;
  repo_name: string;
  git_repo_id: number;
};

const BranchList: React.FC<Props> = ({
  setBranch,
  currentBranch,
  repo_name,
  git_repo_id,
}) => {
  const sortBranches = (branches: string[]) => {
    if (!currentBranch) return branches;
    return [
      currentBranch,
      ...branches.filter((branch) => branch !== currentBranch),
    ];
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState(null);

  const { currentProject } = useContext(Context);

  useEffect(() => {
    api
      .getBranches(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          git_repo_id,
          kind: "github",
          owner: repo_name.split("/")[0],
          name: repo_name.split("/")[1],
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

  }, [searchFilter]);

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
        ? branches
          .filter((branch) => {
            return branch.toLowerCase().includes(searchFilter.toLowerCase());
          })
          .sort((a: string, b: string) => {
            const aIndex = a
              .toLowerCase()
              .indexOf(searchFilter.toLowerCase());
            const bIndex = b
              .toLowerCase()
              .indexOf(searchFilter.toLowerCase());
            return aIndex - bIndex;
          })
        : sortBranches(branches).slice(0, 10);

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

const BranchName = styled.div<{ lastItem: boolean; disabled?: boolean }>`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props) => (props.lastItem ? "#00000000" : "#606166")};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};
  background: #ffffff11;
  :hover {
    background: ${(props) => (props.disabled ? "#ffffff11" : "#ffffff22")};
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
  > div {
    margin-left: auto;
    display: flex;
    align-items: center;

    > span {
      text-transform: capitalize;

      :last-child {
        margin-right: 15px;
      }
    }

    > i {
      margin-left: 10px;
      margin-right: 15px;
      font-size: 18px;
      color: #03b503;
    }
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
  position: relative;
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
