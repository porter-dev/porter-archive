import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React, { useEffect, useState, useContext } from "react";
import { useHistory, useLocation } from "react-router";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";
import styled from "styled-components";

type Props = {
    dbData: any
};

const SettingsTab: React.FC<Props> = ({ dbData
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
        currentCluster,
        currentProject,
        setCurrentError,
        setCurrentOverlay,
    } = useContext(Context);
    const history = useHistory();
    const location = useLocation();
    const handleUninstallChart = async () => {
        setCurrentOverlay(null);
        // const syncedEnvGroups = currentChart.config?.container?.env?.synced || [];
        // const removeApplicationToEnvGroupPromises = syncedEnvGroups.map(
        //   (envGroup: any) => {
        //     return api.removeApplicationFromEnvGroup(
        //       "<token>",
        //       {
        //         name: envGroup?.name,
        //         app_name: currentChart.name,
        //       },
        //       {
        //         project_id: currentProject.id,
        //         cluster_id: currentCluster.id,
        //         namespace: currentChart.namespace,
        //       }
        //     );
        //   }
        // );
        try {
            console.log("Delete Chart");
            ;
        } catch (error) {
            console.log(error);
            setCurrentError("Couldn't uninstall chart, please try again");
        }
        pushFiltered(
            {
                history,
                location,
            },
            `/databases`,
            []
        );

    };


    return (
        <StyledTemplateComponent>
            <Text size={16}>Delete &quot;{dbData?.name}&quot;</Text>
            <Spacer y={0.5} />
            <Text color="helper">
                Delete this application and all of its resources.
            </Text>
            <Spacer y={0.5} />
            <Button
                color="#b91133"
                onClick={() => {
                    setCurrentOverlay({
                        message: `Are you sure you want to delete ${dbData?.name}?`,
                        onYes: handleUninstallChart,
                        onNo: () => setCurrentOverlay(null),
                    });

                }}
            >
                Delete {dbData?.name}
            </Button>
        </StyledTemplateComponent>
    );
};

export default SettingsTab;

const StyledTemplateComponent = styled.div`
width: 100%;
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