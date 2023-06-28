import React, { useEffect, useRef } from "react";
import Modal from "components/porter/Modal";
import TitleSection from "components/TitleSection";
import { Log } from "../logs/useAgentLogs";
import Text from "components/porter/Text";
import danger from "assets/danger.svg";

import ExpandedIncidentLogs from "./ExpandedIncidentLogs";

interface LogsModalProps {
    logs: Log[];
    setModalVisible: (x: boolean) => void;
    logsName: string;
}
const LogsModal: React.FC<LogsModalProps> = ({ logs, logsName, setModalVisible }) => {
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
                <Text size={16}>Logs for {logsName}</Text>
            </TitleSection>
            <ExpandedIncidentLogs logs={logs} />
        </Modal>
    );
};

export default LogsModal;