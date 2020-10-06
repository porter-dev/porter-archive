import React, { Component, useState, useContext } from 'react';
import styled from 'styled-components';
import { useQuery, useSubscription } from '@apollo/client'; 
import helpers from '../../helpers';

import { SUBSCRIBE_TO_RESOURCE_UPDATES } from '../../queries';

function StatusSummary(props) {
    let namespace = props.namespace;
    let resources = props.resources;

    const { ...resourcesSub } = useSubscription(SUBSCRIBE_TO_RESOURCE_UPDATES, {
        variables: { namespace: namespace }
    });
    
    let cpuUsed = helpers.cpuParser(resources.used['limits.cpu']);
    let cpuHard = helpers.cpuParser(resources.hard['limits.cpu']);
    
    let memUsed = `${helpers.memoryParser(resources.used['limits.memory']) / (1024 ** 2)}Mi`;
    let memHard = `${helpers.memoryParser(resources.hard['limits.memory']) / (1024 ** 2)}Mi`;
    
    if (resourcesSub.data) {
      cpuUsed = parseFloat(cpuUsed) + parseFloat(resourcesSub.data.resourceUpdates.cpu);
      memUsed = `${(helpers.memoryParser(resources.used['limits.memory']) + parseFloat(resourcesSub.data.resourceUpdates.memory)) / (1024 ** 2)}Mi`;
    }

    cpuUsed = Number((cpuUsed).toFixed(2))

    return (
        <StatusSection>
        <Indicator /> 
        <Status> 
        {`${resources.used.pods ? resources.used.pods : '?'}/${resources.hard.pods ? resources.hard.pods : '?'}`} containers created 
        </Status>
        <Indicator /> 
        <Status> 
        {`${memUsed}/${memHard}`} RAM reserved 
        </Status>
        <Indicator /> 
        <Status> 
        {`${cpuUsed}/${cpuHard}`} vCPUs reserved 
        </Status>    
        </StatusSection>
    )
}

export default StatusSummary;

const StatusSection = styled.div`
  font-size: 13px;
  color: ${props => props.theme.statusSummary};
  display: flex;
  margin-left: 10px;
  align-items: center;
`;

const Indicator = styled.div`
  min-width: 9px;
  min-height: 9px;
  background: ${props => props.theme.indicator};
  border-radius: 10px;
  margin-right: 10px;
`;

const Status = styled.span`
  font-size: 13px;
  margin-right: 24px; 
`