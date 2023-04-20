import React from "react"
import Service, { DEFAULT_SERVICE, ServiceType } from "./Service";
import styled from "styled-components";

interface ServicesProps {
    services: ServiceType[];
    setServices: (services: ServiceType[]) => void;
}

const Services: React.FC<ServicesProps> = ({
    services,
    setServices,
}) => {
    return (
        <>
            {services.length > 0 &&
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
            }
            <AddServiceButton onClick={() => setServices([...services, DEFAULT_SERVICE])}>
                <i className="material-icons add-icon">add_icon</i>
                Add a new service
            </AddServiceButton>
        </>
    )
}

export default Services

const ServicesContainer = styled.div`
    margin-bottom: 10px;
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