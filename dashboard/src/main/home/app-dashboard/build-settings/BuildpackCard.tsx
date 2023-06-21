import React from "react";
import { Buildpack } from "./BuildpackStack";
import { DeviconsNameList } from "assets/devicons-name-list";
import styled, { keyframes } from "styled-components";
import { Draggable } from "react-beautiful-dnd";

interface Props {
    buildpack: Buildpack;
    action: 'add' | 'remove';
    onClickFn: (buildpack: string) => void;
    index: number;
    draggable: boolean;
}

const BuildpackCard: React.FC<Props> = ({
    buildpack,
    action,
    onClickFn,
    index,
    draggable,
}) => {
    const [languageName] = buildpack.name?.split("/").reverse();

    const devicon = DeviconsNameList.find(
        (devicon) => languageName.toLowerCase() === devicon.name
    );

    const icon = `devicon-${devicon?.name}-plain colored`;

    return (
        draggable ?
            <Draggable
                draggableId={buildpack.name}
                index={index}
                key={buildpack.name}
            >
                {(provided) => (
                    <StyledCard
                        marginBottom="5px"
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        ref={provided.innerRef}
                        key={buildpack.name}
                    >
                        <ContentContainer>
                            <Icon disableMarginRight={devicon == null} className={icon} />
                            <EventInformation>
                                <EventName>{buildpack?.name}</EventName>
                            </EventInformation>
                        </ContentContainer>
                        <ActionContainer>
                            <ActionButton
                                onClick={() => onClickFn(buildpack.buildpack)}
                            >
                                <span className="material-icons">{action === "remove" ? "delete" : "add"}</span>
                            </ActionButton>

                        </ActionContainer>
                    </StyledCard>
                )}
            </Draggable>
            :
            <StyledCard marginBottom="5px" key={buildpack.name}>
                <ContentContainer>
                    <Icon disableMarginRight={devicon == null} className={icon} />
                    <EventInformation>
                        <EventName>{buildpack?.name}</EventName>
                    </EventInformation>
                </ContentContainer>
                <ActionContainer>
                    <ActionButton
                        onClick={() => onClickFn(buildpack.buildpack)}
                    >
                        <span className="material-icons">{action === "remove" ? "delete" : "add"}</span>
                    </ActionButton>

                </ActionContainer>
            </StyledCard>
    );
}

export default BuildpackCard;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div<{ marginBottom?: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #494b4f;
  background: ${({ theme }) => theme.fg};
  margin-bottom: ${(props) => props.marginBottom || "30px"};
  border-radius: 8px;
  padding: 14px;
  overflow: hidden;
  height: 60px;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const Icon = styled.span<{ disableMarginRight: boolean }>`
  font-size: 20px;
  margin-left: 10px;
  ${(props) => {
        if (!props.disableMarginRight) {
            return "margin-right: 20px";
        }
    }}
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
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
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;