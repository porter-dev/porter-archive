import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type PorterApp } from "@porter-dev/api-contracts";
import axios from "axios";
import _ from "lodash";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Back from "components/porter/Back";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { LatestRevisionProvider } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { type AppInstance } from "main/home/app-dashboard/apps/types";
import EnvSettings from "main/home/app-dashboard/validate-apply/app-settings/EnvSettings";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { AddonsList } from "main/home/managed-addons/AddonsList";
import { clientAddonToProto } from "lib/addons";
import { usePorterYaml } from "lib/hooks/usePorterYaml";
import { clientAppToProto } from "lib/porter-apps";

import api from "shared/api";
import { Context } from "shared/Context";
import { valueExists } from "shared/util";
import addOns from "assets/add-ons.svg";

import { AppSelector } from "./AppSelector";
import { ConsolidatedServices } from "./ConsolidatedServices";
import {
  appTemplateClientValidator,
  type AppTemplateFormData,
  type EncodedAddonWithEnv,
} from "./PreviewAppDataContainer";
import { PreviewGHAModal } from "./PreviewGHAModal";
import { RevisionLoader } from "./RevisionLoader";

export const CreateTemplate: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const history = useHistory();

  const [step, setStep] = useState(0);
  const [selectedApp, setSelectedApp] = useState<AppInstance | null>(null);
  const [validatedAppProto, setValidatedAppProto] = useState<PorterApp | null>(
    null
  );
  const [createError, setCreateError] = useState("");
  const [showGHAModal, setShowGHAModal] = useState(false);
  const [{ variables, secrets }, setFinalizedAppEnv] = useState<{
    variables: Record<string, string>;
    secrets: Record<string, string>;
  }>({
    variables: {},
    secrets: {},
  });
  const [encodedAddons, setEncodedAddons] = useState<EncodedAddonWithEnv[]>([]);
  const [detectedServices, setDetectedServices] = useState<{
    detected: boolean;
    count: number;
  }>({ detected: false, count: 0 });

  const envTemplateFormMethods = useForm<AppTemplateFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(appTemplateClientValidator),
    defaultValues: {
      app: {
        name: {
          value: "",
          readOnly: false,
        },
        build: {
          method: "pack",
          context: "./",
          builder: "",
          buildpacks: [],
        },
        env: [],
        efsStorage: {
          enabled: false,
        },
      },
      source: {
        git_repo_name: "",
        git_branch: "",
        porter_yaml_path: "",
      },
      deletions: {
        serviceNames: [],
        envGroupNames: [],
        predeploy: [],
        initialDeploy: [],
      },
      addons: [],
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setValue,
    watch,
  } = envTemplateFormMethods;

  const source = watch("source");

  const { detectedServices: servicesFromYaml, detectedName } = usePorterYaml({
    source: source.type === "github" ? source : null,
    appName: "",
  });

  const errorMessagesDeep = useMemo(() => {
    return Object.values(_.mapValues(errors, (error) => error?.message));
  }, [errors]);

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (errorMessagesDeep.length > 0) {
      return <Error message={`App update failed. ${errorMessagesDeep[0]}`} />;
    }

    if (isSubmitSuccessful) {
      return "success";
    }

    return "";
  }, [isSubmitting, errorMessagesDeep]);

  const onSubmit = handleSubmit((data) => {
    setCreateError("");

    const proto = clientAppToProto(data);
    setValidatedAppProto(proto);

    const addons = data.addons.map((addon) => {
      const variables = match(addon.config)
        .returnType<Record<string, string>>()
        .with({ type: "postgres" }, (conf) => ({
          POSTGRESQL_USERNAME: conf.username,
        }))
        .with({ type: "redis" }, (conf) => ({
          REDIS_PASSWORD: conf.password,
        }))
        .otherwise(() => ({}));
      const secrets = match(addon.config)
        .returnType<Record<string, string>>()
        .with({ type: "postgres" }, (conf) => ({
          POSTGRESQL_PASSWORD: conf.password,
        }))
        .with({ type: "redis" }, (conf) => ({
          REDIS_PASSWORD: conf.password,
        }))
        .otherwise(() => ({}));

      const proto = clientAddonToProto(addon);

      return {
        base64_addon: btoa(proto.toJsonString()),
        variables,
        secrets,
      };
    });
    setEncodedAddons(addons);

    const { env } = data.app;
    const variables = env
      .filter((e) => !e.hidden && !e.deleted)
      .reduce((acc: Record<string, string>, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
    const secrets = env
      .filter((e) => !e.deleted)
      .reduce((acc: Record<string, string>, item) => {
        if (item.hidden) {
          acc[item.key] = item.value;
        }
        return acc;
      }, {});
    setFinalizedAppEnv({ variables, secrets });

    setShowGHAModal(true);
  });

  const createTemplateAndWorkflow = useCallback(
    async ({
      app,
      variables,
      secrets,
      addons = [],
    }: {
      app: PorterApp | null;
      variables: Record<string, string>;
      secrets: Record<string, string>;
      addons?: EncodedAddonWithEnv[];
    }) => {
      try {
        if (!app || !selectedApp || !currentCluster || !currentProject) {
          return false;
        }

        await api.createAppTemplate(
          "<token>",
          {
            b64_app_proto: btoa(app.toJsonString()),
            variables,
            secrets,
            base_deployment_target_id: selectedApp.deployment_target.id ?? "",
            addons,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            porter_app_name: app.name,
          }
        );

        return true;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          setCreateError(err.response?.data?.error);
          return false;
        }

        setCreateError(
          "An error occurred while creating the CI workflow. Please try again."
        );
        return false;
      }
    },
    [selectedApp, currentCluster?.id, currentProject?.id]
  );

  useEffect(() => {
    if (servicesFromYaml && !detectedServices.detected) {
      const { services, predeploy, build: detectedBuild } = servicesFromYaml;
      setValue("app.services", services);
      setValue("app.predeploy", [predeploy].filter(valueExists));

      if (detectedBuild) {
        setValue("app.build", detectedBuild);
      }
      setDetectedServices({
        detected: true,
        count: services.length,
      });
    }

    if (!servicesFromYaml && detectedServices.detected) {
      setValue("app.services", []);
      setValue("app.predeploy", []);
      setDetectedServices({
        detected: false,
        count: 0,
      });
    }
  }, [servicesFromYaml, detectedName, detectedServices.detected]);

  useEffect(() => {
    if (selectedApp?.deployment_target.id) {
      const queryParams = new URLSearchParams(location.search);
      queryParams.set("target", selectedApp.deployment_target.id.toString());
      history.push({
        search: queryParams.toString(),
      });
    }
  }, [selectedApp]);

  useEffect(() => {
    if (selectedApp) {
      setStep(3);
    }
  }, [selectedApp?.id]);

  return (
    <>
      <Back to="/apps" />
      <DashboardHeader
        prefix={<Icon src={addOns} />}
        title="Create a new preview template"
        capitalize={false}
        disableLineBreak
      />
      <DarkMatter />
      <FormProvider {...envTemplateFormMethods}>
        <form onSubmit={onSubmit}>
          <VerticalSteps
            currentStep={step}
            steps={[
              <>
                <Text size={16}>Choose an existing app</Text>
                <Spacer y={0.5} />
                <AppSelector
                  selectedApp={selectedApp}
                  setSelectedApp={setSelectedApp}
                />
                <Spacer y={0.5} />
              </>,
              <>
                <Text size={16}>Datastore Addons</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Ephemeral datastores will be created for each preview app
                </Text>
                <Spacer y={0.5} />
                <AddonsList />
                <Spacer y={0.5} />
              </>,
              !selectedApp?.name ? (
                <>
                  <Text size={16}>Service overrides</Text>
                  <Spacer y={0.5} />
                  <ConsolidatedServices />
                  <Text size={16}>Env variable overrides</Text>
                  <Spacer y={0.5} />
                  <Text color="helper">
                    Change environment variables to test keys or values suitable
                    for previews
                  </Text>
                  <EnvSettings baseEnvGroups={[]} />
                </>
              ) : (
                <LatestRevisionProvider
                  key={selectedApp?.id}
                  appName={selectedApp?.name}
                >
                  <>
                    <RevisionLoader>
                      <Text size={16}>Service overrides</Text>
                      <Spacer y={0.5} />
                      <ConsolidatedServices />
                      <Text size={16}>Env variable overrides</Text>
                      <Spacer y={0.5} />
                      <Text color="helper">
                        Change environment variables to test keys or values
                        suitable for previews
                      </Text>
                      <EnvSettings baseEnvGroups={[]} />
                    </RevisionLoader>
                    {showGHAModal && (
                      <PreviewGHAModal
                        onClose={() => {
                          setShowGHAModal(false);
                        }}
                        savePreviewConfig={async () =>
                          await createTemplateAndWorkflow({
                            app: validatedAppProto,
                            variables,
                            secrets,
                            addons: encodedAddons,
                          })
                        }
                        error={createError}
                      />
                    )}
                  </>
                </LatestRevisionProvider>
              ),
              <>
                <Button
                  type="submit"
                  status={buttonStatus}
                  loadingText={"Creating..."}
                  width={"120px"}
                  disabled={isSubmitting}
                >
                  Create
                </Button>
              </>,
            ].filter((x) => x)}
          />
        </form>
      </FormProvider>
    </>
  );
};

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 28px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
