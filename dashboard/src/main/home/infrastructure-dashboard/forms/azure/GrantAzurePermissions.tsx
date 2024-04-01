import React, { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import { Error as ErrorComponent } from "components/porter/Error";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderAzure } from "lib/clusters/constants";
import { connectToAzureAccount } from "lib/hooks/useCloudProvider";
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

const azurePermissionsFormValidator = z.object({
  subscriptionId: z.string().min(1, { message: "Required" }),
  clientId: z.string().min(1, { message: "Required" }),
  servicePrincipalKey: z.string().min(1, { message: "Required" }),
  tenantId: z.string().min(1, { message: "Required" }),
});
type AzurePermissionsForm = z.infer<typeof azurePermissionsFormValidator>;

const GrantAzurePermissions: React.FC<Props> = ({
  goBack,
  proceed,
  projectId,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { showIntercomWithMessage } = useIntercom();

  const azurePermissionsForm = useForm<AzurePermissionsForm>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(azurePermissionsFormValidator),
  });
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = azurePermissionsForm;

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }
    if (errorMessage) {
      return <ErrorComponent message={errorMessage} maxWidth="600px" />;
    }

    return "";
  }, [isSubmitting, errorMessage]);

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      const cloudProviderCredentialIdentifier = await connectToAzureAccount({
        subscriptionId: data.subscriptionId,
        clientId: data.clientId,
        servicePrincipalKey: data.servicePrincipalKey,
        tenantId: data.tenantId,
        projectId,
      });
      proceed({ cloudProviderCredentialIdentifier });
    } catch (err) {
      showIntercomWithMessage({
        message: "I am running into an issue setting up Azure permissions.",
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
    } finally {
      setIsSubmitting(false);
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
        <Img src={CloudProviderAzure.icon} />
        <Text size={16}>Grant Azure permissions</Text>
      </Container>
      <Spacer y={1} />
      <Text color="helper">
        Grant Porter permissions to create infrastructure in your Azure
        subscription.
      </Text>
      <Spacer y={1} />
      <VerticalSteps
        onlyShowCurrentStep={true}
        currentStep={currentStep}
        steps={[
          <>
            <Text size={16}>Set up your Azure subscription</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Follow our{" "}
              <Link
                to="https://docs.porter.run/provision/provisioning-on-azure"
                target="_blank"
              >
                documentation
              </Link>{" "}
              to create your service principal and prepare your subscription for
              use with Porter.
            </Text>
            <Spacer y={1} />
            <Button
              onClick={() => {
                setCurrentStep(1);
              }}
            >
              Continue
            </Button>
          </>,
          <>
            <Text size={16}>Input Azure service principal credentials</Text>
            <Spacer height="15px" />
            <Text color="helper">
              Provide the credentials for an Azure Service Principal authorized
              on your Azure subscription.
            </Text>
            <Spacer y={1} />
            <Text size={16}>Subscription ID</Text>
            <Spacer y={0.5} />
            <ControlledInput
              placeholder="ex: 12345678-abcd-1234-abcd-12345678abcd"
              type="text"
              width="300px"
              error={errors.subscriptionId?.message}
              {...register("subscriptionId")}
            />
            <Spacer y={1} />
            <Text size={16}>App ID</Text>
            <Spacer y={0.5} />
            <ControlledInput
              placeholder="ex: 12345678-abcd-1234-abcd-12345678abcd"
              type="text"
              width="300px"
              error={errors.clientId?.message}
              {...register("clientId")}
            />
            <Spacer y={1} />
            <Text size={16}>Password</Text>
            <Spacer y={0.5} />
            <ControlledInput
              placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
              type="password"
              width="300px"
              error={errors.servicePrincipalKey?.message}
              {...register("servicePrincipalKey")}
            />
            <Spacer y={1} />
            <Text size={16}>Tenant ID</Text>
            <Spacer y={0.5} />
            <ControlledInput
              placeholder="ex: 12345678-abcd-1234-abcd-12345678abcd"
              type="text"
              width="300px"
              error={errors.tenantId?.message}
              {...register("tenantId")}
            />
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
                status={buttonStatus}
                onClick={onSubmit}
                loadingText={"Checking permissions..."}
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

export default GrantAzurePermissions;
