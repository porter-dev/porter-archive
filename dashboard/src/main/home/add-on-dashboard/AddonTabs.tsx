import React, { useEffect, useMemo } from "react";
import AnimateHeight from "react-animate-height";
import { useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { type ClientAddon } from "lib/addons";

import { useAddonContext } from "./AddonContextProvider";
import AddonSaveButton from "./AddonSaveButton";
import Configuration from "./common/Configuration";
import Settings from "./common/Settings";

const validTabs = ["configuration", "settings", "advanced"] as const;
const DEFAULT_TAB = "configuration" as const;
type ValidTab = (typeof validTabs)[number];

type Props = {
  tabParam?: string;
};
const AddonTabs: React.FC<Props> = ({ tabParam }) => {
  const history = useHistory();
  const { addon } = useAddonContext();

  const {
    reset,
    formState: { isDirty },
  } = useFormContext<ClientAddon>();

  useEffect(() => {
    reset(addon);
  }, [addon]);

  const tabs = useMemo(() => {
    const tabs = [
      {
        label: "Configuration",
        value: "configuration" as ValidTab,
      },
      {
        label: "Settings",
        value: "settings" as ValidTab,
      },
    ];

    return tabs;
  }, []);

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  return (
    <DashboardWrapper>
      <AnimateHeight height={isDirty ? "auto" : 0}>
        <Banner
          type="warning"
          suffix={
            <AddonSaveButton
              height={"10px"}
              disabledTooltipPosition={"bottom"}
            />
          }
        >
          Changes you are currently previewing have not been saved.
          <Spacer inline width="5px" />
        </Banner>
        <Spacer y={1} />
      </AnimateHeight>
      <TabSelector
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/addons/${addon.name.value}/${tab}`);
        }}
      />
      <Spacer y={1} />
      {match(currentTab)
        .with("configuration", () => <Configuration type={addon.config.type} />)
        .with("settings", () => <Settings />)
        .otherwise(() => null)}
    </DashboardWrapper>
  );
};

export default AddonTabs;

const DashboardWrapper = styled.div`
  width: 100%;
  min-width: 300px;
  height: fit-content;
`;
