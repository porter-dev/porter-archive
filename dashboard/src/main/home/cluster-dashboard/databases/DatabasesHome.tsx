import React, { useContext, useState } from "react";
import TabSelector from "components/TabSelector";
import DashboardHeader from "../DashboardHeader";
import DatabasesList from "./DatabasesList";
import { StatusPage } from "main/home/onboarding/steps/ProvisionResources/forms/StatusPage";
import { Context } from "shared/Context";

const DatabasesHome = () => {
  const { currentProject } = useContext(Context);
  const [currentTab, setCurrentTab] = useState("databases-list");

  return (
    <div>
      <DashboardHeader
        image="storage"
        title="Databases"
        description="List of databases created and linked to this cluster."
        materialIconClass="material-icons-outlined"
        disableLineBreak
      />
      <TabSelector
        currentTab={currentTab}
        options={[
          {
            label: "Databases",
            value: "databases-list",
            component: <DatabasesList />,
          },
          {
            label: "Provisioner status",
            value: "provisioner-status",
            component: (
              <StatusPage
                project_id={currentProject.id}
                filter={["rds"]}
                setInfraStatus={() => {}}
              />
            ),
          },
        ]}
        setCurrentTab={(newTab) => {
          setCurrentTab(newTab);
        }}
      />
    </div>
  );
};

export default DatabasesHome;
