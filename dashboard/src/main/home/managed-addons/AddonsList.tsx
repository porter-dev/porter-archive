import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";
import { z } from "zod";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Modal from "components/porter/Modal";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type AppTemplateFormData } from "main/home/cluster-dashboard/preview-environments/v2/setup-app/PreviewAppDataContainer";
import { defaultClientAddon } from "lib/addons";

import postgresql from "assets/postgresql.svg";
import redis from "assets/redis.svg";

import { AddonListRow } from "./AddonListRow";

const addAddonFormValidator = z.object({
  name: z
    .string()
    .min(1, { message: "A service name is required" })
    .max(30)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Lowercase letters, numbers, and " - " only.',
    }),
  type: z.enum(["postgres", "redis"]),
});
type AddAddonFormValues = z.infer<typeof addAddonFormValidator>;

export const AddonsList: React.FC = () => {
  const [showAddAddonModal, setShowAddAddonModal] = useState(false);

  const { control: appTemplateControl } = useFormContext<AppTemplateFormData>();

  // add addon modal form
  const {
    register,
    watch,
    control,
    reset,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<AddAddonFormValues>({
    reValidateMode: "onChange",
    resolver: zodResolver(addAddonFormValidator),
    defaultValues: {
      name: "",
      type: "postgres",
    },
  });

  const addonName = watch("name");
  const addonType = watch("type");

  const { append, update, remove, fields } = useFieldArray({
    control: appTemplateControl,
    name: "addons",
  });

  useEffect(() => {
    const existingAddonNames = fields.map((f) => f.name);
    if (existingAddonNames.some((n) => n.value === addonName)) {
      setError("name", {
        message: "Addon name must be unique",
      });
    } else {
      clearErrors("name");
    }
  }, [fields]);

  const onSubmit = handleSubmit((data) => {
    const baseAddon = defaultClientAddon(data.type);
    append({
      ...baseAddon,
      name: {
        value: data.name,
        readOnly: false,
      },
    });

    reset();
    setShowAddAddonModal(false);
  });

  return (
    <>
      <AddonsContainer>
        {fields.map((addon, idx) => (
          <AddonListRow
            key={addon.id}
            index={idx}
            addon={addon}
            update={update}
            remove={remove}
          />
        ))}
      </AddonsContainer>
      <AddAddonButton
        onClick={() => {
          setShowAddAddonModal(true);
        }}
      >
        <I className="material-icons add-icon">add</I>
        Include add-on in preview environments
      </AddAddonButton>
      <Spacer y={0.5} />
      {showAddAddonModal && (
        <Modal
          closeModal={() => {
            setShowAddAddonModal(false);
          }}
          width="500px"
        >
          <Text size={16}>Include an addon in your preview environment</Text>
          <Spacer y={1} />
          <Text color="helper">Select a service type:</Text>
          <Spacer y={0.5} />
          <Container row>
            <AddonIcon>
              {match(addonType)
                .with("postgres", () => <img src={postgresql} />)
                .with("redis", () => <img src={redis} />)
                .exhaustive()}
            </AddonIcon>
            <Controller
              name="type"
              control={control}
              render={({ field: { onChange } }) => (
                <Select
                  value={addonType}
                  width="100%"
                  setValue={(value: string) => {
                    onChange(value);
                  }}
                  options={[
                    { label: "Postgres", value: "postgres" },
                    { label: "Redis", value: "redis" },
                  ]}
                />
              )}
            />
          </Container>
          <Spacer y={1} />
          <Text color="helper">Name this service:</Text>
          <Spacer y={0.5} />
          <ControlledInput
            type="text"
            placeholder="ex: my-postgres"
            width="100%"
            error={errors.name?.message}
            {...register("name")}
          />
          <Spacer y={1} />
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!!errors.name?.message}
          >
            <I className="material-icons">add</I> Add service
          </Button>
        </Modal>
      )}
    </>
  );
};

const AddonsContainer = styled.div`
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const AddonIcon = styled.div`
  border: 1px solid #494b4f;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 35px;
  width: 35px;
  min-width: 35px;
  margin-right: 10px;
  overflow: hidden;
  border-radius: 5px;
  > img {
    height: 18px;
    animation: floatIn 0.5s 0s;
    @keyframes floatIn {
      from {
        opacity: 0;
        transform: translateY(7px);
      }
      to {
        opacity: 1;
        transform: translateY(0px);
      }
    }
  }
`;

const AddAddonButton = styled.div`
  color: #aaaabb;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  align-items: center;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  .add-icon {
    width: 30px;
    font-size: 20px;
  }
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 7px;
  justify-content: center;
`;
