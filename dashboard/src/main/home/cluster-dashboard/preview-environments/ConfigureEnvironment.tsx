import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import Back from "components/porter/Back";
import DashboardHeader from "../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { serviceValidator } from "main/home/app-dashboard/new-app-flow/serviceTypes";
import VerticalSteps from "components/porter/VerticalSteps";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import CheckboxRow from "components/form-components/CheckboxRow";
import Helper from "components/form-components/Helper";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "components/porter/Button";
import EnvironmentApps from "./create-env/EnvironmentApps";
import { porterAppValidator } from "main/home/app-dashboard/types/porterApp";
import { PorterYamlSchema } from "main/home/app-dashboard/new-app-flow/schema";

type ConfigureEnvironmentProps = {};

const formData = z.object({
  name: z.string().default("preview"),
  clusterID: z.number(),
  projectID: z.number(),
  gitInstallationID: z.number(),
  auto: z.boolean().default(false),
  applications: z
    .array(
      porterAppValidator.extend({
        baseYaml: PorterYamlSchema.optional(),
        services: z.array(serviceValidator),
        envVariables: z.array(
          z.object({
            key: z.string(),
            value: z.string(),
            hidden: z.boolean(),
            locked: z.boolean(),
            deleted: z.boolean(),
          })
        ),
      })
    )
    .refine((apps) => new Set(apps.map((a) => a.name)).size === apps.length, {
      message: "Duplicate app names are not allowed",
    }),
});
export type FormData = z.infer<typeof formData>;

export const ConfigureEnvironment: React.FC<ConfigureEnvironmentProps> = ({}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const methods = useForm<FormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(formData),
    defaultValues: {
      name: "preview",
      clusterID: currentCluster?.id,
      projectID: currentProject?.id,
    },
  });
  const { watch, control } = methods;

  const [metaStep, setMetaStep] = useState(1);

  const name = watch("name");

  useEffect(() => {
    if (name?.length) {
      setMetaStep(2);
    }
  }, [name]);

  if (!currentProject || !currentCluster) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      <CenterWrapper>
        <MainForm>
          <Back to="/preview-environments" />
          <DashboardHeader
            image={PullRequestIcon}
            title="Preview environments"
            capitalize={false}
            description="Create full-stack preview environments for your pull requests."
          />
          <VerticalSteps
            currentStep={metaStep}
            steps={[
              <>
                <Text size={16}>Applications</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Include existing or new applications in your preview
                  environment.
                </Text>
                <Spacer y={0.5} />
                <EnvironmentApps
                  projectId={currentProject.id}
                  clusterId={currentCluster.id}
                />
              </>,
              <>
                <Text size={16}>Automatic pull request deployments</Text>
                <Helper style={{ marginTop: "10px", marginBottom: "10px" }}>
                  If you enable this option, the new pull requests will be
                  automatically deployed.
                </Helper>
                <CheckboxWrapper>
                  <Controller
                    control={control}
                    name="auto"
                    render={({ field: { onChange, value } }) => (
                      <CheckboxRow
                        label="Enable automatic deploys"
                        checked={value}
                        toggle={() => {
                          onChange(!value);
                          setMetaStep(2);
                        }}
                        wrapperStyles={{
                          disableMargin: true,
                        }}
                      />
                    )}
                  />
                </CheckboxWrapper>
              </>,
              <Button
                disabled={!Boolean(name?.length)}
                onClick={() => {}}
                width={"120px"}
              >
                Continue
              </Button>,
            ]}
          />
        </MainForm>
      </CenterWrapper>
    </FormProvider>
  );
};

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MainForm = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
`;
