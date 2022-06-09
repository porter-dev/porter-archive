import DynamicLink from "components/DynamicLink";
import React from "react";
import DashboardHeader from "../DashboardHeader";
import StackList from "./_StackList";
const Dashboard = () => {
  return (
    <>
      <DashboardHeader
        materialIconClass="material-icons-outlined"
        image={"lan"}
        title="Preview Environments"
        description=""
      />
      <DynamicLink to={"/stacks/launch"}>Create stack</DynamicLink>
      <StackList />
    </>
  );
};

export default Dashboard;
