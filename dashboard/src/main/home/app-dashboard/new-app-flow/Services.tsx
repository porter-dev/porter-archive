import React, { useState } from "react"
import Service, { DEFAULT_SERVICE, ServiceType } from "./Service";
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

interface ServicesProps {
  services: ServiceType[];
  setServices: (services: ServiceType[]) => void;
}

const Services: React.FC<ServicesProps> = ({
  services,
  setServices,
}) => {
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(false);
  const [serviceName, setServiceName] = useState<string>('');

  return (
    <>
      {services.length > 0 &&
        <>
          <ServicesContainer>
            {services.map((service, index) => {
              return (
                <Service
                  serviceData={service}
                  editService={(newService: ServiceType) => setServices(services.map((s, i) => i === index ? newService : s))}
                  deleteService={() => setServices(services.filter((_, i) => i !== index))}
                />
              )
            })}
          </ServicesContainer>
          <Spacer y={0.5} />
        </>
      }
      <AddServiceButton onClick={() => setShowAddServiceModal(true)}>
        <i className="material-icons add-icon">add_icon</i>
        Add a new service
      </AddServiceButton>
      {showAddServiceModal && (
        <Modal closeModal={() => setShowAddServiceModal(false)}>
          <Text size={16}>Add a new service</Text>
          <Spacer y={1} />
          <Text color="helper">Select a service type:</Text>
          <Spacer y={0.5} />
          <Container row>
            <ServiceIcon>
              <img src={web} />
            </ServiceIcon>
            <Select 
              options={[
                { label: 'Web', value: 'web' },
                { label: 'Worker', value: 'worker' },
                { label: 'Job', value: 'job' }
              ]}
            />
          </Container>
          <Spacer y={1} />
          <Text color="helper">Name this service:</Text>
          <Spacer y={0.5} />
          <Input
            placeholder="ex: my-service"
            width="300px"
            value={serviceName}
            setValue={setServiceName}
          />
          <Spacer y={1} />
          <Button onClick={() => {
             setServices([...services, DEFAULT_SERVICE])
          }}>
            <I className="material-icons">add</I> Add service
          </Button>
        </Modal>
      )}
    </>
  )
}

export default Services

const ServiceIcon = styled.div`
  border: 1px solid #494b4f;
  height: 36px;
  > img {
    height: 20px;
    margin-right: 15px;
    padding-left: 10px;
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
`;

const AddServiceButton = styled.div`
  color:  #aaaabb;
  background: #26292e;
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