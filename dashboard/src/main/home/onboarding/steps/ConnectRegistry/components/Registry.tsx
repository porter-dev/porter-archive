import Loading from "components/Loading";
import { OFState } from "main/home/onboarding/state";
import React, { useContext, useState } from "react";
import api from "shared/api";
import { integrationList } from "shared/common";
import { Context } from "shared/Context";
import styled from "styled-components";
import { useSnapshot } from "valtio";

const serviceToProvider: {
  [key: string]: string;
} = {
  docr: "do",
  ecr: "aws",
  gcr: "gcp",
};

const Registry: React.FC<{ registry: any; onDelete: () => void }> = (props) => {
  const { registry, onDelete } = props;
  const service = serviceToProvider[registry?.service];
  const icon = integrationList[service || registry?.service]?.icon;
  const subtitle = integrationList[registry?.service]?.label;
  const snap = useSnapshot(OFState);
  const { setCurrentError } = useContext(Context);

  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const deleteRegistry = async (id: number) => {
    const projectId = snap.StateHandler?.project?.id;

    if (typeof projectId !== "number") {
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteRegistryIntegration(
        "<token>",
        {},
        {
          project_id: projectId,
          registry_id: id,
        }
      );
      onDelete();
      setIsDeleting(false);
    } catch (error) {
      setIsDeleting(false);
      setCurrentError(error);
      setHasError(true);
      setTimeout(() => setHasError(false), 1000);
    }
  };

  return (
    <React.Fragment key={registry.name}>
      <Integration>
        <MainRow disabled={false}>
          <Flex>
            <Icon src={icon && icon} />
            <Description>
              <Label>{registry?.name}</Label>
              <IntegrationSubtitle>{subtitle}</IntegrationSubtitle>
            </Description>
          </Flex>
          <MaterialIconTray disabled={false}>
            {isDeleting && (
              <I disabled>
                <Loading height={"28px"} width="28px" />
              </I>
            )}
            {hasError && (
              <ErrorI className="material-icons">priority_high</ErrorI>
            )}
            {!hasError && !isDeleting && (
              <I
                className="material-icons"
                onClick={() => deleteRegistry(registry?.id)}
              >
                delete
              </I>
            )}
          </MaterialIconTray>
        </MainRow>
      </Integration>
    </React.Fragment>
  );
};

export default Registry;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  background: #26282f;
  margin-bottom: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 15px 0px #00000055;
`;

const IntegrationSubtitle = styled.div`
  color: #aaaabb;
  font-size: 13px;
  display: flex;
  align-items: center;
  padding-top: 5px;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
`;

const I = styled.i`
  color: #ffffff44;
  :hover {
    cursor: ${(props: { disabled?: boolean }) =>
      props.disabled ? "not-allowed" : "pointer"};
  }
`;

const ErrorI = styled(I)`
  color: #ed5f85;
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  border-radius: 5px;
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
    > i {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: #ffffff44;
    margin-right: -7px;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const MaterialIconTray = styled.div`
  max-width: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > i {
    background: #26282f;
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    margin: 0 5px;

    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Description = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;
