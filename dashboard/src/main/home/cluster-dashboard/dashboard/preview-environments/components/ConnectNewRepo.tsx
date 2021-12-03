import SelectRow from "components/form-components/SelectRow";
import React from "react";

const ConnectNewRepo = () => {
  return (
    <div>
      <SelectRow
        label="Select repo"
        options={[]}
        setActiveValue={(selectedRepo) => console.log(selectedRepo)}
        value={""}
      />
    </div>
  );
};

export default ConnectNewRepo;
