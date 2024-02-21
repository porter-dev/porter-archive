import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import styled from "styled-components";
import { z } from "zod";

import UploadArea from "components/form-components/UploadArea";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { Error as ErrorComponent } from "components/porter/Error";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderGCP } from "lib/clusters/constants";
import { connectToGCPAccount } from "lib/hooks/useCloudProvider";

import { CheckItem } from "../../modals/PreflightChecksModal";
import { BackButton, Img } from "../CreateClusterForm";

type Props = {
  goBack: () => void;
  proceed: ({
    cloudProviderCredentialIdentifier,
  }: {
    cloudProviderCredentialIdentifier: string;
  }) => void;
  projectId: number;
};

const gcpPermissionsFormValidator = z.object({
  serviceAccountKey: z.string().min(1, { message: "Required" }),
  gcpProjectId: z.string().min(1, { message: "Required" }),
});
type GCPPermissionsForm = z.infer<typeof gcpPermissionsFormValidator>;

const GrantGCPPermissions: React.FC<Props> = ({
  goBack,
  proceed,
  projectId,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [uploadFileError, setUploadFileError] = useState<string>("");
  const [
    cloudProviderCredentialIdentifier,
    setCloudProviderCredentialIdentifier,
  ] = useState<string>("");

  const gcpPermissionsForm = useForm<GCPPermissionsForm>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(gcpPermissionsFormValidator),
  });
  const { setValue, watch } = gcpPermissionsForm;
  const gcpProjectId = watch("gcpProjectId");
  const serviceAccountKey = watch("serviceAccountKey");

  const handleLoadJSON = (serviceAccountJSONFile: string): void => {
    setUploadFileError("");
    setValue("gcpProjectId", "");
    setValue("serviceAccountKey", "");
    try {
      JSON.parse(serviceAccountJSONFile);
    } catch (e) {
      setUploadFileError(
        "Uploaded file is not a valid JSON file. Please upload a new file."
      );
      return;
    }
    const serviceAccountCredentials = z
      .object({
        project_id: z.string(),
      })
      .safeParse(JSON.parse(serviceAccountJSONFile));

    if (!serviceAccountCredentials.success) {
      setUploadFileError(
        `Invalid GCP service account credentials. No project ID detected in uploaded file. Please try again.`
      );
    } else {
      setValue("gcpProjectId", serviceAccountCredentials.data.project_id);
      setValue("serviceAccountKey", serviceAccountJSONFile);
    }
  };

  const data = useQuery(
    [
      "gcpPermissionsGranted",
      projectId,
      gcpProjectId,
      serviceAccountKey,
      currentStep,
    ],
    async () => {
      if (!gcpProjectId || !serviceAccountKey) {
        return "";
      }

      return await connectToGCPAccount({
        projectId,
        gcpProjectId,
        serviceAccountKey,
      });
    },
    {
      enabled: !!gcpProjectId && !!serviceAccountKey && currentStep === 2,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    }
  );
  useEffect(() => {
    if (data.isSuccess) {
      setCloudProviderCredentialIdentifier(data.data);
    }
  }, [data]);

  return (
    <div>
      <Container row>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={CloudProviderGCP.icon} />
        <Text size={16}>Grant GCP permissions</Text>
      </Container>
      <Spacer y={1} />
      <Text color="helper">
        Grant Porter permissions to create infrastructure in your Google
        project.
      </Text>
      <Spacer y={1} />
      <VerticalSteps
        currentStep={currentStep}
        onlyShowCurrentStep={true}
        steps={[
          <>
            <Text size={16}> Create the service account </Text>
            <Spacer y={0.5} />
            <Link
              to="https://docs.porter.run/standard/getting-started/provisioning-on-gcp"
              target="_blank"
            >
              Follow the steps in the Porter docs to generate your service
              account credentials
            </Link>
            <Spacer y={0.5} />
            <Button
              onClick={() => {
                setCurrentStep(1);
              }}
              height={"15px"}
            >
              Continue
            </Button>
          </>,
          <>
            <Text size={16}>Upload service account credentials</Text>
            <Spacer y={1} />
            <UploadArea
              setValue={(x: string) => {
                handleLoadJSON(x);
              }}
              label="🔒 GCP Key Data (JSON)"
              placeholder="Drag a GCP Service Account JSON here, or click to browse."
              width="100%"
              height="100%"
              isRequired={true}
            />
            {uploadFileError && (
              <>
                <AppearingDiv color={"#fcba03"}>
                  <ErrorComponent message={uploadFileError} maxWidth="600px" />
                </AppearingDiv>
              </>
            )}
            {gcpProjectId && (
              <>
                <AppearingDiv color={projectId ? "#8590ff" : "#fcba03"}>
                  <I className="material-icons">check</I>
                  <Text color="#8590ff">
                    Your cluster will be provisioned in Google Project:{" "}
                    {gcpProjectId}
                  </Text>
                </AppearingDiv>
              </>
            )}
            <Spacer y={1} />
            <Container row>
              <Button
                onClick={() => {
                  setCurrentStep(0);
                }}
                color="#222222"
              >
                Back
              </Button>
              <Spacer inline x={0.5} />
              <Button
                disabled={!!uploadFileError}
                onClick={() => {
                  setCurrentStep(2);
                }}
              >
                Continue
              </Button>
            </Container>
          </>,
          <>
            <Text size={16}>Check permissions</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Checking if Porter can access your Google project. This can take
              up to a minute.
            </Text>
            <Spacer y={1} />
            <CheckItem
              preflightCheck={{
                title: "GCP project accessible",
                status: cloudProviderCredentialIdentifier
                  ? "success"
                  : "pending",
              }}
            />
            <Spacer y={1} />
            <Container row>
              <Button
                onClick={() => {
                  setCurrentStep(2);
                }}
                color="#222222"
              >
                Back
              </Button>
              <Spacer inline x={0.5} />
              <Button
                onClick={() => {
                  proceed({ cloudProviderCredentialIdentifier });
                }}
                disabled={!cloudProviderCredentialIdentifier}
              >
                Continue
              </Button>
            </Container>
          </>,
        ]}
      />
    </div>
  );
};

export default GrantGCPPermissions;

const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  align-items: center;
  color: ${(props) => props.color || "#ffffff44"};
  margin-left: 10px;
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

const I = styled.i`
  font-size: 18px;
  margin-right: 5px;
`;
