import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import api from 'shared/api';

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { Context } from 'shared/Context';

import envGrad from 'assets/env-group-grad.svg';

import Back from "components/porter/Back";
import DashboardHeader from '../cluster-dashboard/DashboardHeader';
import VerticalSteps from 'components/porter/VerticalSteps';
import Text from 'components/porter/Text';
import Spacer from 'components/porter/Spacer';
import { ControlledInput } from 'components/porter/ControlledInput';
import Button from 'components/porter/Button';
import EnvGroupArray from './EnvGroupArray';

const envGroupFormValidator = z.object({
  name: z
    .string()
    .min(1, { message: "A service name is required" })
    .max(30)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Lowercase letters, numbers, and " - " only.',
    }),
  value: z.number().default(1),
});
type EnvGroupFormData = z.infer<typeof envGroupFormValidator>;

const CreateEnvGroup: React.FC = () => {
  const envGroupFormMethods = useForm<EnvGroupFormData>({
    resolver: zodResolver(envGroupFormValidator),
    reValidateMode: "onSubmit",
  });
  const { 
    register,
    watch,
    trigger,
    handleSubmit,
    formState: { errors },
  } = envGroupFormMethods;

  const [step, setStep] = React.useState(0);
  const name = watch("name");

  const [envVariables, setEnvVariables] = useState<any[]>([]);

  useEffect(() => {
    const validateName = async (): Promise<void> => {
      const isNameValid = await trigger("name");
      if (isNameValid) {
        setStep((prev) => Math.max(prev, 1));
      } else {
        setStep(0);
      }
    };
    void validateName();
  }, [name, trigger]);

  const onSubmit = handleSubmit(async (data) => {
    console.log("hello??")
    console.log(data)
  });

  return (
    <CenterWrapper>
      <Div>
        <StyledConfigureTemplate>
          <Back to="/env" />
          <DashboardHeader
            prefix={<Icon src={envGrad} />}
            title="Create a new env group"
            capitalize={false}
            disableLineBreak
          />
          <DarkMatter />
          <FormProvider {...envGroupFormMethods}>
            <form onSubmit={onSubmit}>
              <VerticalSteps
                currentStep={step}
                steps={[
                  <>
                    <Text size={16}>Env group name</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Lowercase letters, numbers, and &quot;-&quot; only.
                    </Text>
                    <Spacer height="20px" />
                    <ControlledInput
                      placeholder="ex: academic-sophon-db"
                      type="text"
                      width="320px"
                      error={name?.length > 0 ? errors.name?.message : undefined}
                      {...register("name")}
                    />
                  </>,
                  <>
                    <Text size={16}>Environment variables</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Set environment-specific configuration including evironment variables and secrets.
                    </Text>
                    <Spacer height="15px" />
                    <EnvGroupArray
                      values={envVariables}
                      setValues={setEnvVariables}
                      fileUpload={true}
                      secretOption={true}
                    />
                  </>,
                  <Button
                    key={2}
                    type="submit"
                    loadingText="Creating env group . . ."
                    width="120px"
                  >
                    Deploy app
                  </Button>
                ]}
              />
            </form>
          </FormProvider>
          <Spacer y={3} />
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
}

export default CreateEnvGroup;

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

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-5px"};
`;