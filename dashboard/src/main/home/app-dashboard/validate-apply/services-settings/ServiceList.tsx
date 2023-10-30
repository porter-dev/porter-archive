import React, { useEffect, useMemo, useState } from "react";
import ServiceContainer from "./ServiceContainer";
import styled from "styled-components";
import Spacer from "components/porter/Spacer";
import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Select from "components/porter/Select";
import Container from "components/porter/Container";
import Button from "components/porter/Button";

import web from "assets/web.png";
import worker from "assets/worker.png";
import job from "assets/job.png";
import { z } from "zod";
import { PorterAppFormData } from "lib/porter-apps";
import {
  ClientService,
  defaultSerialized,
  deserializeService,
  isPredeployService,
} from "lib/porter-apps/services";
import {
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { ControlledInput } from "components/porter/ControlledInput";
import { PorterAppVersionStatus } from "lib/hooks/useAppStatus";
import { zodResolver } from "@hookform/resolvers/zod";
import { useClusterResources } from "shared/ClusterResourcesContext";

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
  serviceVersionStatus?: Record<string, PorterAppVersionStatus[]>;
  internalNetworkingDetails?: {
    namespace: string;
    appName: string;
  };
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
}) => {
  // top level app form
  const { control: appControl } = useFormContext<PorterAppFormData>();

  const { currentClusterResources: {maxCPU, maxRAM, clusterContainsGPUNodes, clusterIngressIp, defaultCPU, defaultRAM} } = useClusterResources();

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
    name: fieldArrayName === "app.services" ? "deletions.serviceNames" : "deletions.predeploy",
  });

  const serviceType = watch("type");
  const serviceName = watch("name");

  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(
    false
  );

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
  }, [serviceName, isPredeploy])

  const isServiceNameDuplicate = (name: string) => {
    return services.some(({ svc: s }) => s.name.value === name);
  };

  const maybeRenderAddServicesButton = () => {
    if (isPredeploy && services.find((s) => isPredeployService(s.svc))) {
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

  const onRemove = (index: number) => {
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
                clusterContainsGPUNodes={clusterContainsGPUNodes}
                internalNetworkingDetails={internalNetworkingDetails}
                clusterIngressIp={clusterIngressIp}
              />
            ) : null;
          })}
        </ServicesContainer>
      )}
      {maybeRenderAddServicesButton()}
      {showAddServiceModal && (
        <Modal closeModal={() => setShowAddServiceModal(false)} width="500px">
          <Text size={16}>{addNewText}</Text>
          <Spacer y={1} />
          <Text color="helper">Select a service type:</Text>
          <Spacer y={0.5} />
          <Container row>
            <ServiceIcon>
              {serviceType === "web" && <img src={web} />}
              {serviceType === "worker" && <img src={worker} />}
              {serviceType === "job" && <img src={job} />}
            </ServiceIcon>
            <Controller
              name="type"
              control={control}
              render={({ field: { onChange } }) => (
                <Select
                  value={serviceType}
                  width="100%"
                  setValue={(value: string) => onChange(value)}
                  options={[
                    { label: "Web", value: "web" },
                    { label: "Worker", value: "worker" },
                    { label: "Cron Job", value: "job" },
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

const ServiceIcon = styled.div`
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
