import Input from "components/porter/Input";
import React from "react"
import AnimateHeight from "react-animate-height";
import styled from "styled-components";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import web from "assets/web.png";
import TabSelector from "components/TabSelector";


interface ServiceProps {
  serviceData: ServiceType;
  editService: (service: ServiceType) => void;
  deleteService: () => void;
}

export type ServiceType = {
  name: string;
  type: string;
  runCommand: string;
  ram: number;
  cpu: number;
}

export const DEFAULT_SERVICE: ServiceType = {
  name: 'new-service',
  type: '',
  runCommand: '',
  ram: 512,
  cpu: 500,
}

const Service: React.FC<ServiceProps> = ({
  serviceData,
  deleteService,
  editService,
}) => {
  const [showExpanded, setShowExpanded] = React.useState<boolean>(true)

  const renderServiceSettings = () => {
    return (
      <>
        <TabSelector
          options={[
            { label: 'Web', value: 'web' },
            { label: 'Worker', value: 'worker' },
            { label: 'Cron', value: 'cron' },
          ]}
          currentTab="web"
          setCurrentTab={(e) => {}}
        />
      </>
    )
  }

  return (
    <>
      <ServiceHeader
        showExpanded={showExpanded}
        onClick={() => setShowExpanded(!showExpanded)}
      >
        <ServiceTitle>
          <ActionButton >
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {serviceData.name !== DEFAULT_SERVICE.name && serviceData.name.trim().length > 0 ? serviceData.name : "New Service"}
          {serviceData.type === 'web' && <Icon src={web} />}
        </ServiceTitle>
        <ActionButton onClick={(e) => {
          deleteService();
        }}>
          <span className="material-icons">delete</span>
        </ActionButton>
      </ServiceHeader>
      <AnimateHeight
        height={showExpanded ? "auto" : 0}
      >
        <StyledSourceBox showExpanded={showExpanded}>
          {renderServiceSettings()}
        </StyledSourceBox>
      </AnimateHeight>
      <Spacer y={0.5} />
    </>
  )
}

export default Service;

const ServiceTitle = styled.div`
    display: flex;
    align-items: center;
`;

const StyledSourceBox = styled.div<{ showExpanded: boolean }>`
  width: 100%;
  color: #ffffff;
  padding: 14px 25px 20px;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  background: ${props => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  height: 400px;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;

  :hover {
    color: white;
  }

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;

const SliderContainer = styled.div`
    display: flex;
    align-items: center;
`;

const ServiceHeader = styled.div`
  flex-direction: row;
  display: flex;
  height: 60px;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${props => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  border-bottom-left-radius: ${({ showExpanded }) => showExpanded && "0px"};
  border-bottom-right-radius: ${({ showExpanded }) => showExpanded && "0px"};

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -10px;
    transform: ${(props: { showExpanded: boolean }) => props.showExpanded ? "" : "rotate(-90deg)"};
  }

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

const Icon = styled.img`
  height: 18px;
  margin-right: 15px;
  margin-left: 10px;

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