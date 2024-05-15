import React, { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import Environment from "main/home/app-dashboard/app-view/tabs/Environment";
import { clientAddonFromProto } from "lib/addons";
import { useAppWithPreviewOverrides } from "lib/hooks/useAppWithPreviewOverrides";

import {
  useEnvTemplate,
  type AppTemplateFormData,
} from "../EnvTemplateContextProvider";
import { type ExistingTemplateWithEnv } from "../types";
import { Addons } from "./Addons";
import { PreviewGHAModal } from "./PreviewGHAModal";
import { RequiredApps } from "./RequiredApps";
import { ServiceSettings } from "./ServiceSettings";

type Props = {
  existingTemplate: ExistingTemplateWithEnv | null;
};

const previewEnvSettingsTabs = [
  "services",
  "variables",
  "addons",
  "required-apps",
] as const;

type PreviewEnvSettingsTab = (typeof previewEnvSettingsTabs)[number];

export const PreviewAppDataContainer: React.FC<Props> = ({
  existingTemplate,
}) => {
  const [tab, setTab] = useState<PreviewEnvSettingsTab>("services");
  const {
    showGHAModal,
    setShowGHAModal,
    createError,
    buttonStatus,
    savePreviewConfig,
  } = useEnvTemplate();

  const { appEnv, latestProto, servicesFromYaml, latestSource } =
    useLatestRevision();

  const { reset } = useFormContext<AppTemplateFormData>();

  const withPreviewOverrides = useAppWithPreviewOverrides({
    latestApp: latestProto,
    detectedServices: servicesFromYaml,
    existingTemplate: existingTemplate?.template_b64_app_proto,
    templateEnv: existingTemplate?.app_env,
    appEnv,
  });

  const existingAddonsWithEnv = useMemo(() => {
    if (!existingTemplate) {
      return [];
    }

    const existingAddons = existingTemplate.addons.map((addon) =>
      clientAddonFromProto({
        addon: addon.addon,
        variables: addon.variables,
        secrets: addon.secrets,
      })
    );

    return existingAddons;
  }, [existingTemplate?.addons]);

  useEffect(() => {
    reset({
      app: withPreviewOverrides,
      source: latestSource,
      deletions: {
        serviceNames: [],
        envGroupNames: [],
        predeploy: [],
        initialDeploy: [],
      },
      addons: existingAddonsWithEnv,
    });
  }, [withPreviewOverrides, latestSource, existingAddonsWithEnv]);

  return (
    <>
      <TabSelector
        noBuffer
        options={[
          { label: "App Services", value: "services" },
          { label: "Environment Variables", value: "variables" },
          { label: "Required Apps", value: "required-apps" },
          { label: "Add-ons", value: "addons" },
        ]}
        currentTab={tab}
        setCurrentTab={(tab: string) => {
          if (tab === "services") {
            setTab("services");
          } else if (tab === "variables") {
            setTab("variables");
          } else if (tab === "required-apps") {
            setTab("required-apps");
          } else {
            setTab("addons");
          }
        }}
      />
      <Spacer y={1} />
      {match(tab)
        .with("services", () => <ServiceSettings buttonStatus={buttonStatus} />)
        .with("variables", () => <Environment buttonStatus={buttonStatus} />)
        .with("required-apps", () => (
          <RequiredApps buttonStatus={buttonStatus} />
        ))
        .with("addons", () => <Addons buttonStatus={buttonStatus} />)
        .exhaustive()}
      {showGHAModal && (
        <PreviewGHAModal
          onClose={() => {
            setShowGHAModal(false);
          }}
          savePreviewConfig={savePreviewConfig}
          error={createError}
        />
      )}
    </>
  );
};
