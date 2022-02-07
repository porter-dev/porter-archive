import React, { useContext, useEffect, useState } from "react";
import TabSelector from "components/TabSelector";
import DashboardHeader from "../DashboardHeader";
import DatabasesList from "./DatabasesList";
import { StatusPage } from "main/home/onboarding/steps/ProvisionResources/forms/StatusPage";
import { Context } from "shared/Context";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { getQueryParam, useRouting } from "shared/routing";

const AvailableTabs = ["databases-list", "provisioner-status"] as const;

type AvailableTabsType = typeof AvailableTabs[number];

const DatabasesHome = () => {
  const { currentProject } = useContext(Context);
  const [currentTab, setCurrentTab] = useState<AvailableTabsType>(
    "databases-list"
  );
  const { pushQueryParams } = useRouting();
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    const current_tab = getQueryParam(
      { location },
      "current_tab"
    ) as AvailableTabsType;

    if (!AvailableTabs.includes(current_tab)) {
      return;
    }

    if (current_tab !== currentTab) {
      setCurrentTab(current_tab);
    }
  }, [location.search, history]);

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
        setCurrentTab={(newTab: AvailableTabsType) => {
          pushQueryParams({ current_tab: newTab });
        }}
      />
    </div>
  );
};

export default DatabasesHome;
