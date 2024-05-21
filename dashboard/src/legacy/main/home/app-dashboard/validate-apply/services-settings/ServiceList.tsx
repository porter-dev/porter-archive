import React, { useContext, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import job from "legacy/assets/job.png";
import web from "legacy/assets/web.png";
import worker from "legacy/assets/worker.png";
import Button from "legacy/components/porter/Button";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type ClientCluster } from "legacy/lib/clusters/types";
import { type ClientServiceStatus } from "legacy/lib/hooks/useAppStatus";
import { type PorterAppFormData } from "legacy/lib/porter-apps";
import {
  defaultSerialized,
  deserializeService,
  getServiceResourceAllowances,
  isInitdeployService,
  isPredeployService,
} from "legacy/lib/porter-apps/services";
import {
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import styled from "styled-components";
import { z } from "zod";

import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";

import { Context } from "shared/Context";

import Tiles from "../../../../../components/porter/Tiles";
import ServiceContainer from "./ServiceContainer";

const addServiceFormValidator = z.object({
  name: z
    .string()
    .min(1, { message: "A service name is required" })
    .max(30)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Lowercase letters, numbers, and " - " only.',
    }),
  type: z.enum(["web", "worker", "job"]),
});
type AddServiceFormValues = z.infer<typeof addServiceFormValidator>;

type ServiceListProps = {
  addNewText: string;
  lifecycleJobType?: "predeploy" | "initdeploy";
  existingServiceNames?: string[];
  fieldArrayName: "app.services" | "app.predeploy" | "app.initialDeploy";
  serviceVersionStatus?: Record<string, ClientServiceStatus[]>;
  internalNetworkingDetails?: {
    namespace: string;
    appName: string;
  };
  allowAddServices?: boolean;
  cluster?: ClientCluster;
};

const ServiceList: React.FC<ServiceListProps> = ({
  addNewText,
  fieldArrayName,
  lifecycleJobType,
  existingServiceNames = [],
  serviceVersionStatus,
  internalNetworkingDetails = {
    namespace: "",
    appName: "",
  },
  allowAddServices = true,
}) => {
  // top level app form
  const { control: appControl } = useFormContext<PorterAppFormData>();
  const { currentProject } = useContext(Context);

  const { nodes } = useClusterContext();
  const { newServiceDefaultCpuCores, newServiceDefaultRamMegabytes } =
    useMemo(() => {
      return getServiceResourceAllowances(
        nodes,
        currentProject?.sandbox_enabled
      );
    }, [nodes]);

  // add service modal form
  const {
    register,
    watch,
    control,
    reset,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<AddServiceFormValues>({
    reValidateMode: "onChange",
    resolver: zodResolver(addServiceFormValidator),
    defaultValues: {
      name: "",
      type: "web",
    },
  });
  const { append, remove, update, fields } = useFieldArray({
    control: appControl,
    name: fieldArrayName,
  });
  const {
    append: appendDeletion,
    remove: removeDeletion,
    fields: deletedServices,
  } = useFieldArray({
    control: appControl,
    name:
      fieldArrayName === "app.services"
        ? "deletions.serviceNames"
        : lifecycleJobType === "predeploy"
        ? "deletions.predeploy"
        : "deletions.initialDeploy",
  });

  const serviceName = watch("name");

  const [showAddServiceModal, setShowAddServiceModal] =
    useState<boolean>(false);

  const services = useMemo(() => {
    // if predeploy, only show predeploy services
    // if not predeploy, only show non-predeploy services
    if (lifecycleJobType === "predeploy") {
      return fields.map((svc, idx) => {
        const predeploy = isPredeployService(svc);
        return {
          svc,
          idx,
          included: predeploy,
        };
      });
    }

    if (lifecycleJobType === "initdeploy") {
      return fields.map((svc, idx) => {
        const initdeploy = isInitdeployService(svc);
        return {
          svc,
          idx,
          included: initdeploy,
        };
      });
    }

    return fields.map((svc, idx) => {
      const predeploy = isPredeployService(svc);
      const initdeploy = isInitdeployService(svc);
      return {
        svc,
        idx,
        included: !predeploy && !initdeploy,
      };
    });
  }, [fields]);

  useEffect(() => {
    if (isServiceNameDuplicate(serviceName)) {
      setError("name", {
        message: "A service with this name already exists",
      });
    } else if (
      lifecycleJobType !== "predeploy" &&
      serviceName === "predeploy"
    ) {
      setError("name", {
        message: "predeploy is a reserved service name",
      });
    } else if (
      lifecycleJobType !== "initdeploy" &&
      serviceName === "initdeploy"
    ) {
      setError("name", {
        message: "initdeploy is a reserved service name",
      });
    } else {
      clearErrors("name");
    }
  }, [serviceName, lifecycleJobType]);

  const isServiceNameDuplicate = (name: string): boolean => {
    return services.some(({ svc: s }) => s.name.value === name);
  };

  const maybeRenderAddServicesButton = (): JSX.Element | null => {
    if (
      (lifecycleJobType === "predeploy" &&
        services.find((s) => isPredeployService(s.svc))) ||
      (lifecycleJobType === "initdeploy" &&
        services.find((s) => isInitdeployService(s.svc))) ||
      !allowAddServices
    ) {
      return null;
    }
    return (
      <>
        <AddServiceButton
          onClick={() => {
            if (lifecycleJobType === "initdeploy") {
              append(
                deserializeService({
                  service: defaultSerialized({
                    name: "initdeploy",
                    type: "initdeploy",
                    defaultCPU: newServiceDefaultCpuCores,
                    defaultRAM: newServiceDefaultRamMegabytes,
                  }),
                  expanded: true,
                })
              );
              return;
            }

            if (lifecycleJobType === "predeploy") {
              append(
                deserializeService({
                  service: defaultSerialized({
                    name: "pre-deploy",
                    type: "predeploy",
                    defaultCPU: newServiceDefaultCpuCores,
                    defaultRAM: newServiceDefaultRamMegabytes,
                  }),
                  expanded: true,
                })
              );
              return;
            }

            setShowAddServiceModal(true);
          }}
        >
          <i className="material-icons add-icon">add_icon</i>
          {addNewText}
        </AddServiceButton>
        <Spacer y={0.5} />
      </>
    );
  };

  const onSubmit = handleSubmit(async (data) => {
    // if service was previously deleted, remove from deletions
    // handle case such as pre-deploy (which always has the same name)
    // being deleted and then re-added
    const previouslyDeleted = deletedServices.findIndex(
      (s) => s.name === data.name
    );
    if (previouslyDeleted !== -1) {
      removeDeletion(previouslyDeleted);
    }

    append(
      deserializeService({
        service: defaultSerialized({
          ...data,
          defaultCPU: newServiceDefaultCpuCores,
          defaultRAM: newServiceDefaultRamMegabytes,
        }),
        expanded: true,
      })
    );

    reset();
    setShowAddServiceModal(false);
  });

  const onRemove = (index: number): void => {
    const name = services[index].svc.name.value;
    remove(index);

    if (existingServiceNames.includes(name)) {
      appendDeletion({ name });
    }
  };

  return (
    <>
      {services.length > 0 && (
        <ServicesContainer>
          {services.map(({ svc, idx, included }) => {
            return included ? (
              <ServiceContainer
                index={idx}
                key={svc.id}
                service={svc}
                update={update}
                remove={onRemove}
                status={serviceVersionStatus?.[svc.name.value]}
                internalNetworkingDetails={internalNetworkingDetails}
                existingServiceNames={existingServiceNames}
              />
            ) : null;
          })}
        </ServicesContainer>
      )}
      {maybeRenderAddServicesButton()}
      {showAddServiceModal && (
        <Modal
          closeModal={() => {
            setShowAddServiceModal(false);
          }}
          width="800px"
        >
          <Text size={16}>{addNewText}</Text>
          <Spacer y={1} />
          <Text color="helper">Select a service type:</Text>
          <Spacer y={0.5} />
          <Controller
            name="type"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Tiles
                tileables={[
                  {
                    icon: web,
                    label: "Web",
                    value: "web",
                    description: "Exposed to internal and/or external traffic",
                  },
                  {
                    icon: worker,
                    label: "Worker",
                    value: "worker",
                    description: "Long running background processes",
                  },
                  {
                    icon: job,
                    label: "Job",
                    value: "job",
                    description: "Scheduled tasks or one-off runs",
                  },
                ]}
                onSelect={onChange}
                selectedValue={value}
                widthPercentage={30}
                gapPixels={20}
              />
            )}
          />
          <Text color="helper">Name this service:</Text>
          <Spacer y={0.5} />
          <ControlledInput
            type="text"
            placeholder="ex: my-service"
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

export default ServiceList;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 7px;
  justify-content: center;
`;

const ServicesContainer = styled.div`
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

const AddServiceButton = styled.div`
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
  transition: all 0.2s;
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
