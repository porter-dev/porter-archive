import React, { useContext, useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { withRouter, type RouteComponentProps } from "react-router";
import styled, { keyframes } from "styled-components";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Error from "components/porter/Error";
import Selector from "components/porter/Selector";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { isAWSCluster } from "lib/clusters/types";
import { type DbFormData } from "lib/databases/types";
import {
  getErrorMessageFromNetworkCall,
  useClusterList,
} from "lib/hooks/useCluster";
import { useDatastoreList } from "lib/hooks/useDatabaseList";
import { useDatastore } from "lib/hooks/useDatastore";
import { useIntercom } from "lib/hooks/useIntercom";

import { Context } from "shared/Context";

type Props = RouteComponentProps & {
  steps: React.ReactNode[];
  currentStep: number;
  form: UseFormReturn<DbFormData>;
};

const DatabaseForm: React.FC<Props> = ({
  steps,
  currentStep,
  form,
  history,
}) => {
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");
  const { create: createDatastore } = useDatastore();
  const { showIntercomWithMessage } = useIntercom();
  const { clusters } = useClusterList();
  const { currentProject } = useContext(Context);

  // only aws clusters supported right now
  const awsClusters = useMemo(() => {
    return clusters.filter(isAWSCluster);
  }, [JSON.stringify(clusters)]);

  const {
    formState: { isSubmitting, errors, isValidating },
    handleSubmit,
    register,
    setValue,
    watch,
  } = form;

  const { datastores: existingDatastores } = useDatastoreList();

  const chosenClusterId = watch("clusterId", 0);

  const onSubmit = handleSubmit(async (data) => {
    setSubmitErrorMessage("");
    if (existingDatastores.some((db) => db.name === data.name)) {
      setSubmitErrorMessage(
        "A datastore with this name already exists. Please choose a different name."
      );
      return;
    }
    try {
      await createDatastore(data);
      history.push(`/datastores/${data.name}`);
    } catch (err) {
      const errorMessage = getErrorMessageFromNetworkCall(
        err,
        "Datastore creation"
      );
      setSubmitErrorMessage(errorMessage);
      showIntercomWithMessage({
        message: "I am having trouble creating a datastore.",
      });
    }
  });

  const submitButtonStatus = useMemo(() => {
    if (isSubmitting || isValidating) {
      return "loading";
    }
    if (submitErrorMessage) {
      return <Error message={submitErrorMessage} />;
    }
    return undefined;
  }, [isSubmitting, submitErrorMessage, isValidating]);

  useEffect(() => {
    if (awsClusters.length > 0) {
      setValue("clusterId", awsClusters[0].id);
    }
  }, [JSON.stringify(awsClusters)]);

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <VerticalSteps
          currentStep={currentStep}
          steps={[
            <>
              <Text size={16}>Specify name</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Lowercase letters, numbers, and &quot;-&quot; only.
              </Text>
              <Spacer height="20px" />
              <ControlledInput
                placeholder="ex: academic-sophon-db"
                type="text"
                width="300px"
                error={errors.name?.message}
                {...register("name")}
              />
              {currentProject?.multi_cluster && (
                <>
                  <Spacer y={1} />
                  <Selector<string>
                    activeValue={chosenClusterId.toString()}
                    width="300px"
                    options={awsClusters.map((c) => ({
                      value: c.id.toString(),
                      label: c.vanity_name,
                      key: c.id.toString(),
                    }))}
                    setActiveValue={(value: string) => {
                      setValue("clusterId", parseInt(value));
                    }}
                    label={"Cluster"}
                  />
                </>
              )}
            </>,
            ...steps,
            <>
              <Text size={16}>Create datastore instance</Text>
              <Spacer y={0.5} />
              <Button
                type="submit"
                status={submitButtonStatus}
                loadingText={"Creating . . ."}
                disabled={isSubmitting || isValidating}
              >
                Create
              </Button>
            </>,
          ]}
        />
        <Spacer height="80px" />
      </form>
    </FormProvider>
  );
};

export default withRouter(DatabaseForm);

export const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

export const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

export const Icon = styled.img`
  margin-right: 15px;
  height: 30px;
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

export const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

export const floatIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px);
  }
`;

export const AppearingErrorContainer = styled.div`
  animation: ${floatIn} 0.5s;
  animation-fill-mode: forwards;
`;

export const RevealButton = styled.div`
  background: ${(props) => props.theme.fg};
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid #494b4f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    filter: brightness(120%);
  }
`;

export const Blur = styled.div`
  filter: blur(5px);
  -webkit-filter: blur(5px);
  position: relative;
  margin-left: -5px;
  font-family: monospace;
`;
