import SearchSelector from "components/SearchSelector";
import React, { useMemo } from "react";
import styled from "styled-components";

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
      <ul>
        {value.map((branch) => (
          <li key={branch}>
            {branch}
            <button onClick={() => handleDeleteBranch(branch)}>Remove</button>
          </li>
        ))}
      </ul>
    </>
  );
};

export default BranchFilterSelector;
