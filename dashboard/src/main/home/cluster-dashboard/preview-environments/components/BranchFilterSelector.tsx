import SearchSelector from "components/SearchSelector";
import React, { useMemo } from "react";
import styled from "styled-components";

const BranchFilterSelector = ({
  value,
  options,
  onChange,
  showLoading,
  multiSelect = true,
}: {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  showLoading?: boolean;
  multiSelect?: boolean;
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
    if (!multiSelect) {
      onChange([branch]);
      return;
    }

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
        {value.map((branch) => (
          <BranchRow key={branch}>
            <div>{branch}</div>
            <RemoveBranchButton onClick={() => handleDeleteBranch(branch)}>
              x
            </RemoveBranchButton>
          </BranchRow>
        ))}
      </BranchRowList>
    </>
  );
};

export default BranchFilterSelector;

const BranchRowList = styled.div`
  margin-block: 15px;
  max-height: 200px;
  overflow-y: auto;
`;

const BranchRow = styled.div`
  padding-inline: 8px;
  gap: 10px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const RemoveBranchButton = styled.div`
  cursor: pointer;
`;
