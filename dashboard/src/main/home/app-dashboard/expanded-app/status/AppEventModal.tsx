import React, { useEffect, useRef } from "react";
import Modal from "components/porter/Modal";
import TitleSection from "components/TitleSection";
import { Log } from "../useAgentLogs";
import Text from "components/porter/Text";
import danger from "assets/danger.svg";

import ExpandedIncidentLogs from "./ExpandedIncidentLogs";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import document from "assets/document.svg";
import styled from "styled-components";
import time from "assets/time.svg";

interface AppEventModalProps {
    logs: Log[];
    setModalVisible: (x: boolean) => void;
    porterAppName: string;
    timestamp: string;
    expandedAppEventMessage: string;
}
const AppEventModal: React.FC<AppEventModalProps> = ({ logs, porterAppName, setModalVisible, timestamp, expandedAppEventMessage }) => {
    const scrollToBottomRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        if (scrollToBottomRef.current) {
            scrollToBottomRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }
    useEffect(() => {
        scrollToBottom();
    }, [scrollToBottomRef]);


    return (
        <Modal closeModal={() => setModalVisible(false)} width={"800px"}>
            <TitleSection icon={danger}>
                <Text size={16}>Details for {porterAppName}</Text>
            </TitleSection>
            <Spacer y={0.5} />
            <Container row>
                <Img src={time} />
                <Spacer inline x={0.5} />
                <Text color="helper">
                    Last updated {timestamp}
                </Text>
            </Container>
            <Spacer y={0.5} />
            <Message>
                <img src={document} />
                {expandedAppEventMessage}
            </Message>
            <ExpandedIncidentLogs logs={logs} />
        </Modal>
    );
};

export default AppEventModal;

const Message = styled.div`
  padding: 20px;
  background: #26292e;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-size: 13px;
  display: flex;
  align-items: center;
  > img {
    width: 13px;
    margin-right: 20px;
  }
`;

const Img = styled.img`
    width: 13px;
`;