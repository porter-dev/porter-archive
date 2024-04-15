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
import DatadogForm from "./DatadogForm";
import Settings from "./tabs/Settings";

const validTabs = ["overview", "settings", "advanced"] as const;
const DEFAULT_TAB = "overview" as const;
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
        label: "Overview",
        value: "overview" as ValidTab,
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
        .with("overview", () =>
          match(addon.config.type)
            .with("datadog", () => <DatadogForm />)
            .otherwise(() => null)
        )
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
