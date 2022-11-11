import SearchSelector from "components/SearchSelector";
import React, { useMemo } from "react";
import styled from "styled-components";
import branch_icon from "assets/branch.png";

const BranchFilterSelector = ({
  value,
  options,
  onChange,
  showLoading,
}: {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  showLoading?: boolean;
}) => {
  const filteredBranches = useMemo(() => {
    if (!options.length) {
      return [];
    }

    if (value.find((branch) => branch === "")) {
      return options;
    }

    return options.filter((branch) => !value.includes(branch));
  }, [options, value]);

  const handleAddBranch = (branch: string) => {
    const newSelectedBranches = [...value, branch];

    onChange(newSelectedBranches);
  };

  const handleDeleteBranch = (branch: string) => {
    const newSelectedBranches = value.filter(
      (selectedBranch) => selectedBranch !== branch
    );

    onChange(newSelectedBranches);
  };

  const placeholder = options?.length
    ? "Find or add a branch..."
    : "No branches found for current repository.";

  return (
    <>
      <SearchSelector
        options={filteredBranches}
        onSelect={(newBranch) => handleAddBranch(newBranch)}
        getOptionLabel={(option) => option}
        placeholder={placeholder}
        showLoading={showLoading}
      />
      {/* List selected branches  */}

      <BranchRowList>
        {value.map((branch, i) => (
          <BranchRow key={branch} isLast={value.length - 1 === i}>
            <img src={branch_icon} />
            <div>{branch}</div>
            <RemoveBranchButton onClick={() => handleDeleteBranch(branch)}>
              <i className="material-icons-round">close</i>
            </RemoveBranchButton>
          </BranchRow>
        ))}
      </BranchRowList>
    </>
  );
};

export default BranchFilterSelector;

const BranchRowList = styled.div`
  border: 1px solid #494b4f;
  border-radius: 5px;
  max-height: 200px;
  margin-top: 22px;
  overflow-y: auto;
`;

const BranchRow = styled.div<{ isLast?: boolean; isSelected?: boolean }>`
  width: 100%;
  padding: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #494b4f")};

  > img {
    width: 17px;
    margin-right: 8px;
  }
`;

const RemoveBranchButton = styled.div`
  cursor: pointer;
  width: 20px;
  display: flex;
  align-items: center;
  border-radius: 20px;
  justify-content: center;
  color: #aaaabb;
  height: 20px;
  margin-left: 12px;
  :hover {
    background: #ffffff11;
  }
  > i {
    font-size: 14px;
  }
`;
