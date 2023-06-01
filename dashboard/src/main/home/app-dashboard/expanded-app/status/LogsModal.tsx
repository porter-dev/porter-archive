import React, { useEffect, useRef } from "react";
import Modal from "components/porter/Modal";
import TitleSection from "components/TitleSection";
import { Log } from "../useAgentLogs";
import Text from "components/porter/Text";
import danger from "assets/danger.svg";

import ExpandedIncidentLogs from "./ExpandedIncidentLogs";
import { SelectedPodType } from "./types";
import { useLogs } from "./useLogs";

interface LogsModalProps {
    selectedPod: SelectedPodType;
    podError: string;
    logsName: string;
    setModalVisible: (x: boolean) => void;
}
const LogsModal: React.FC<LogsModalProps> = ({ selectedPod, setModalVisible, logsName }) => {
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

    const { logs } = useLogs(selectedPod, scrollToBottom);

    const renderLogs = (): Log[] => {
        if (!Array.isArray(logs) || logs?.length === 0) {
            return (
                []
            );
        }

        return logs.map((log, i) => ({
            line: log,
            lineNumber: i + 1,
        }));
    };

    return (
        <Modal closeModal={() => setModalVisible(false)} width={"800px"}>
            <TitleSection icon={danger}>
                <Text size={16}>Logs for {logsName}</Text>
            </TitleSection>
            <ExpandedIncidentLogs logs={renderLogs()} />
        </Modal>
    );
};

export default LogsModal;