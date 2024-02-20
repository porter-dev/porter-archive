import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import styled from "styled-components";
import { z } from "zod";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientCluster } from "lib/clusters/types";
import { type ClientServiceStatus } from "lib/hooks/useAppStatus";
import { type PorterAppFormData } from "lib/porter-apps";
import {
  defaultSerialized,
  deserializeService,
  isPredeployService,
  type ClientService,
} from "lib/porter-apps/services";

import { useClusterResources } from "shared/ClusterResourcesContext";
import job from "assets/job.png";
import web from "assets/web.png";
import worker from "assets/worker.png";

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
  prePopulateService?: ClientService;
  isPredeploy?: boolean;
  existingServiceNames?: string[];
  fieldArrayName: "app.services" | "app.predeploy";
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
  prePopulateService,
  fieldArrayName,
  isPredeploy = false,
  existingServiceNames = [],
  serviceVersionStatus,
  internalNetworkingDetails = {
    namespace: "",
    appName: "",
  },
  allowAddServices = true,
  cluster,
}) => {
  // top level app form
  const { control: appControl } = useFormContext<PorterAppFormData>();

  const {
    currentClusterResources: {
      maxCPU,
      maxRAM,
      maxGPU,
      clusterContainsGPUNodes,
      clusterIngressIp,
      defaultCPU,
      defaultRAM,
      loadBalancerType,
    },
  } = useClusterResources();

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
        : "deletions.predeploy",
  });

  const serviceName = watch("name");

  const [showAddServiceModal, setShowAddServiceModal] =
    useState<boolean>(false);

  const services = useMemo(() => {
    // if predeploy, only show predeploy services
    // if not predeploy, only show non-predeploy services
    return fields.map((svc, idx) => {
      const predeploy = isPredeployService(svc);
      return {
        svc,
        idx,
        included: isPredeploy ? predeploy : !predeploy,
      };
    });
  }, [fields]);

  useEffect(() => {
    if (isServiceNameDuplicate(serviceName)) {
      setError("name", {
        message: "A service with this name already exists",
      });
    } else if (!isPredeploy && serviceName === "predeploy") {
      setError("name", {
        message: "predeploy is a reserved service name",
      });
    } else {
      clearErrors("name");
    }
  }, [serviceName, isPredeploy]);

  const isServiceNameDuplicate = (name: string): boolean => {
    return services.some(({ svc: s }) => s.name.value === name);
  };

  const maybeRenderAddServicesButton = (): JSX.Element | null => {
    if (
      (isPredeploy && services.find((s) => isPredeployService(s.svc))) ||
      !allowAddServices
    ) {
      return null;
    }
    return (
      <>
        <AddServiceButton
          onClick={() => {
            if (!prePopulateService) {
              setShowAddServiceModal(true);
              return;
            }

            append(prePopulateService);
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
          defaultCPU,
          defaultRAM,
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
                maxCPU={maxCPU}
                maxRAM={maxRAM}
                maxGPU={maxGPU}
                clusterContainsGPUNodes={clusterContainsGPUNodes}
                internalNetworkingDetails={internalNetworkingDetails}
                clusterIngressIp={clusterIngressIp}
                showDisableTls={loadBalancerType === "ALB"}
                existingServiceNames={existingServiceNames}
                cluster={cluster}
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
