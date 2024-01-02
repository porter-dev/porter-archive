import { useQueryClient } from "@tanstack/react-query";
import React, {
  useContext,
  useMemo
} from "react";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";


import { Context } from "shared/Context";


import EnvTab from "./tabs/DatabaseEnvTab";
import MetricsTab from "./tabs/MetricsTab";
import Settings from "./tabs/SettingsTab";

// commented out tabs are not yet implemented
// will be included as support is available based on data from app revisions rather than helm releases
const validTabs = [

  "metrics",
  // "debug",
  "environment",
  "settings",
] as const;
const DEFAULT_TAB = "metrics";
type ValidTab = (typeof validTabs)[number];

type DbTabProps = {
  tabParam?: string;
  dbData: any;
  goBack: string;
};

// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

const DatabaseTabs: React.FC<DbTabProps> = ({ tabParam, dbData, goBack }) => {
  const history = useHistory();
  const queryClient = useQueryClient();

  const { currentProject, user } = useContext(Context);

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const tabs = useMemo(() => {
    const base = [
      // { label: "Metrics", value: "metrics" },
      { label: "Connection Info", value: "environment" },
    ];
    base.push({ label: "Settings", value: "settings" });
    return base;
  }, [

  ]);

  return (
    <>
      <TabSelector
        noBuffer
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(
            `/databases/dashboard/${dbData?.type}/${dbData?.name}/${tab}`
          );
        }} /><Spacer y={1} />
      {match(currentTab)
        .with("environment", () => (
          <EnvTab envData={dbData?.env} connectionString={dbData.connection_string} />
        ))
        .with("settings", () => <Settings dbData={dbData} goBack={goBack} />)
        .with("metrics", () => <MetricsTab />)

        .otherwise(() => null)}
      <Spacer y={2} />
    </>
  );
};

export default DatabaseTabs;

const TagIcon = styled.img`
  height: 13px;
  margin-right: 3px;
  margin-top: 1px;
`;
