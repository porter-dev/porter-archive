import React, { useEffect, useState } from "react";
import ServiceContainer from "./ServiceContainer";
import styled from "styled-components";
import Spacer from "components/porter/Spacer";
import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Select from "components/porter/Select";
import Input from "components/porter/Input";
import Container from "components/porter/Container";
import Button from "components/porter/Button";

import web from "assets/web.png";
import worker from "assets/worker.png";
import job from "assets/job.png";
import { Service, ServiceType } from "./serviceTypes";

interface ServicesProps {
  services: Service[];
  setServices: (services: Service[]) => void;
}

const Services: React.FC<ServicesProps> = ({ services, setServices }) => {
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(
    false
  );
  const [serviceName, setServiceName] = useState<string>("");
  const [serviceType, setServiceType] = useState<ServiceType>("web");
  const isServiceNameValid = (name: string) => {
    const regex = /^[a-z0-9-]+$/;

    return regex.test(name);
  };
  const isServiceNameDuplicate = (name: string) => {
    const serviceNames = services.map((service) => service.name);
    return serviceNames.includes(name);
  };

  return (
    <>
      {services.length > 0 && (
        <>
          <ServicesContainer>
            {services.map((service, index) => {
              return (
                <ServiceContainer
                  key={service.name}
                  service={service}
                  editService={(newService: Service) =>
                    setServices(
                      services.map((s, i) => (i === index ? newService : s))
                    )
                  }
                  deleteService={() =>
                    setServices(services.filter((_, i) => i !== index))
                  }
                />
              );
            })}
          </ServicesContainer>
          <Spacer y={0.5} />
        </>
      )}
      <AddServiceButton
        onClick={() => {
          setShowAddServiceModal(true);
          setServiceType("web");
        }}
      >
        <i className="material-icons add-icon">add_icon</i>
        Add a new service
      </AddServiceButton>
      {showAddServiceModal && (
        <Modal closeModal={() => setShowAddServiceModal(false)} width="500px">
          <Text size={16}>Add a new service</Text>
          <Spacer y={1} />
          <Text color="helper">Select a service type:</Text>
          <Spacer y={0.5} />
          <Container row>
            <ServiceIcon>
              {serviceType === "web" && <img src={web} />}
              {serviceType === "worker" && <img src={worker} />}
              {serviceType === "job" && <img src={job} />}
            </ServiceIcon>
            <Select
              value={serviceType}
              width="100%"
              setValue={(value: string) => setServiceType(value as ServiceType)}
              options={[
                { label: "Web", value: "web" },
                { label: "Worker", value: "worker" },
                { label: "Job", value: "job" },
              ]}
            />
          </Container>
          <Spacer y={1} />
          <Text color="helper">Name this service:</Text>
          <Spacer y={0.5} />
          <Input
            placeholder="ex: my-service"
            width="100%"
            value={serviceName}
            error={
              (serviceName != "" &&
                !isServiceNameValid(serviceName) &&
                'Lowercase letters, numbers, and "-" only.') ||
              (serviceName.length > 61 && "Must be 61 characters or less.") ||
              (isServiceNameDuplicate(serviceName) &&
                "Service name is duplicate")
            }
            setValue={setServiceName}
          />
          <Spacer y={1} />
          <Button
            onClick={() => {
              setServices([
                ...services,
                Service.default(serviceName, serviceType, {
                  readOnly: false,
                  value: "",
                }),
              ]);
              setShowAddServiceModal(false);
              setServiceName("");
              setServiceType("web");
            }}
            disabled={
              !isServiceNameValid(serviceName) ||
              isServiceNameDuplicate(serviceName) ||
              serviceName?.length > 61
            }
          >
            <I className="material-icons">add</I> Add service
          </Button>
        </Modal>
      )}
    </>
  );
};

export default Services;

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

const ServicesContainer = styled.div``;

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
