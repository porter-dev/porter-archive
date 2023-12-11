import _ from "lodash";
import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";

import awsRDS from "assets/amazon-rds.png";
import awsElastiCache from "assets/aws-elasticache.png";
import database from "assets/database.svg";
import notFound from "assets/not-found.png";

import { Context } from "shared/Context";
import { search } from "shared/search";
import { AddonCard } from "shared/types";

import Back from "components/porter/Back";
import Fieldset from "components/porter/Fieldset";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import { withRouter, type RouteComponentProps } from "react-router";
import { z } from "zod";
import DatabaseHeader from "./DatabaseHeader";
import DatabaseTabs from "./DatabaseTabs";
import Loading from "components/Loading";


type Props = RouteComponentProps;

const DatabaseView: React.FC<Props> = ({ match }) => {
    const [dbData, setDbData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const params = useMemo(() => {
        const { params } = match;
        const validParams = z
            .object({
                type: z.string(),
                appName: z.string(),
                tab: z.string().optional(),
            })
            .safeParse(params);

        if (!validParams.success) {
            return {
                type: undefined,
                appName: undefined,
                tab: undefined,
            };
        }

        return validParams.data;
    }, [match]);

    useEffect(() => {
        setIsLoading(true)
        //get api
        const data = {
            "name": "my-redis",
            "type": "elasticache-redis",
            "status": "creating",
            "metadata": [
                {
                    "name": "arn",
                    "value": "arn:aws:elasticache:us-east-1:776540850513:replicationgroup:my-redis"
                },
                {
                    "name": "Node Type",
                    "value": "cache.t4g.micro"
                },
                {
                    "name": "Disk IOPS",
                    "value": "3000"
                },
                {
                    "name": "Disk Size",
                    "value": "10 GB"
                },
                {
                    "name": "Disk Type",
                    "value": "gp3"
                },
                {
                    "name": "Memory Limit",
                    "value": "1 GB"
                },



            ],

            "elasticacheRedisConfig": {
                "input": "config",
                "goes": "here"
            },
            "rdsPostgresConfig": {
                "other": "values",
                "go": "here"
            },
            "rdsAuroraPostgresConfig": {
                "other": "values",
                "go": "here"
            },
            "env": {
                "name": "my-redis",
                "latest_version": 1,
                "variables": {
                    "REDIS_HOST": "master.my-redis.ihqspk.use1.cache.amazonaws.com",
                    "REDIS_PORT": "6379"
                },
                "secret_variables": {
                    "REDIS_PASS": "********"
                },
                "created_at": "2023-12-06T15:48:52Z",
                "linked_applications": [
                    "django"
                ]
            },
            "connection_string": "server=ServerName;Database=DatabaseName;Trusted_Connection=True;"
        }
        setDbData(data);
        setIsLoading(false);
    }, [])


    return (
        <>
            {(isLoading || dbData == null) ?
                <Loading />
                :
                <StyledExpandedDB>
                    <Back to="/databases" />
                    <DatabaseHeader dbData={dbData} />
                    <Spacer y={1} />
                    <DatabaseTabs tabParam={params.tab} dbData={dbData} />
                </StyledExpandedDB>
            }
        </>
    );
};

export default withRouter(DatabaseView);


const StyledExpandedDB = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
