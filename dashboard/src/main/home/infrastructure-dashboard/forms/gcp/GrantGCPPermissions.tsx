import React, { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
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
import { useIntercom } from "lib/hooks/useIntercom";

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadFileError, setUploadFileError] = useState<string>("");
  const { showIntercomWithMessage } = useIntercom();
  const gcpPermissionsForm = useForm<GCPPermissionsForm>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(gcpPermissionsFormValidator),
  });
  const { handleSubmit, setValue, watch } = gcpPermissionsForm;
  const gcpProjectId = watch("gcpProjectId");

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }
    if (errorMessage) {
      return <ErrorComponent message={errorMessage} maxWidth="600px" />;
    }

    return "";
  }, [isSubmitting, errorMessage]);

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

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      const cloudProviderCredentialIdentifier = await connectToGCPAccount({
        projectId,
        gcpProjectId: data.gcpProjectId,
        serviceAccountKey: data.serviceAccountKey,
      });
      proceed({ cloudProviderCredentialIdentifier });
    } catch (err) {
      showIntercomWithMessage({
        message: "I am running into an issue setting up GCP permissions.",
      });
      let message =
        "Permission setup failed: please try again or contact support@porter.run if the error persists.";
      if (axios.isAxiosError(err)) {
        const parsed = z
          .object({ error: z.string() })
          .safeParse(err.response?.data);
        if (parsed.success) {
          message = `Permission setup failed: ${parsed.data.error}`;
        }
      }
      setErrorMessage(message);
    }
  });

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
              <Button
                disabled={!!uploadFileError || isSubmitting}
                onClick={onSubmit}
                status={buttonStatus}
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
