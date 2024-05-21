import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import AddonSaveButton from "main/home/add-on-dashboard/AddonSaveButton";
import { type ClientAddon } from "lib/addons";

const DeepgramForm: React.FC = () => {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<ClientAddon>();

  const {
    append,
    fields: urls,
    remove,
  } = useFieldArray({
    control,
    name: "config.modelUrls",
  });

  return (
    <div>
      <Text size={16}> Release tag </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The release tag for the specific deepgram model you would like to deploy
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.releaseTag")}
        placeholder="ex: release-240426"
        error={errors.config?.releaseTag?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Deepgram API Key </Text>
      <Spacer y={0.5} />
      <Text color="helper"> The API Key provided to you by Deepgram </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.deepgramAPIKey")}
        placeholder="deepgram-api-key"
        error={errors.config?.deepgramAPIKey?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Quay.io Username </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The username to the container registry provided to you by Deepgram
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.quayUsername")}
        placeholder="ex: release-240426"
        error={errors.config?.quayUsername?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Quay.io secret </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The username to the container registry provided to you by Deepgram
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.quaySecret")}
        placeholder="quay.io-secret"
        error={errors.config?.quaySecret?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Quay.io email </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The username to the container registry provided to you by Deepgram
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.quayEmail")}
        placeholder="x@y.com"
        error={errors.config?.quayEmail?.message}
      />
      <Spacer y={1} />
      <Text>Model URLs</Text>
      <Spacer y={0.5} />
      <Text color="helper">The URLs of models you would like to download.</Text>
      <Spacer y={0.5} />
      {urls.map((url, i) => {
        return (
          <div key={url.id}>
            <AnnotationContainer>
              <ControlledInput
                type="text"
                placeholder="ex: www.example.com/model.zip"
                width="275px"
                {...register(`config.modelUrls.${i}.url`)}
                error={errors.config?.modelUrls?.[i]?.url?.message}
              />
              <DeleteButton
                onClick={() => {
                  remove(i);
                }}
              >
                <i className="material-icons">cancel</i>
              </DeleteButton>
            </AnnotationContainer>
            <Spacer y={0.25} />
          </div>
        );
      })}
      <Button
        alt
        onClick={() => {
          append({
            url: "",
          });
        }}
      >
        + Add model URL
      </Button>
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

export default DeepgramForm;

const AnnotationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-left: 8px;
  margin-top: -3px;
  justify-content: center;

  > i {
    font-size: 17px;
    color: #ffffff44;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    :hover {
      color: #ffffff88;
    }
  }
`;
